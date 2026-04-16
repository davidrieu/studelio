"use server";

import { Tag } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mergeInterestsFromFormFields, normalizeSuggestedInterestPicks } from "@/lib/student-interests-form";
import { ensureStudentProgrammeLinkedToCanonical } from "@/lib/student-programme-canonical";

const profileSchema = z.object({
  niveau: z.enum([
    "SIXIEME",
    "CINQUIEME",
    "QUATRIEME",
    "TROISIEME",
    "SECONDE",
    "PREMIERE_GENERALE",
    "PREMIERE_TECHNOLOGIQUE",
    "TERMINALE",
    "BTS",
  ] as const),
  tags: z.array(z.nativeEnum(Tag)).max(10),
  interestsPicked: z.array(z.string()).max(20),
  interestsExtra: z.string().max(500).optional(),
});

export type StudentProfileSettingsState =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function updateStudentProfileSettingsAction(
  _: StudentProfileSettingsState | undefined,
  formData: FormData,
): Promise<StudentProfileSettingsState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return { ok: false, message: "Tu dois être connecté en tant qu’élève." };
  }

  const rawNiveau = formData.get("niveau");
  const rawTags = formData.getAll("tags").filter((v): v is string => typeof v === "string");
  const rawPicked = formData.getAll("interests").filter((v): v is string => typeof v === "string");
  const extra = (formData.get("interestsExtra") as string | null) ?? undefined;

  const interestsPicked = normalizeSuggestedInterestPicks(rawPicked);

  const parsed = profileSchema.safeParse({
    niveau: rawNiveau,
    tags: rawTags,
    interestsPicked,
    interestsExtra: extra,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { ok: false, message: "Vérifie les champs du formulaire.", fieldErrors };
  }

  const { niveau, tags } = parsed.data;
  const interests = mergeInterestsFromFormFields(parsed.data.interestsPicked, parsed.data.interestsExtra);

  const sp = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, programmeId: true },
  });
  if (!sp) {
    return { ok: false, message: "Profil élève introuvable." };
  }

  const programme = await prisma.programme.findUnique({
    where: { niveau },
    select: { id: true },
  });
  if (!programme) {
    return {
      ok: false,
      message: "Ce niveau n’est pas encore disponible dans Studelio. Choisis un autre niveau ou contacte le support.",
    };
  }

  const newChapterIds = (
    await prisma.programmeChapter.findMany({
      where: { programmeId: programme.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({
        where: { id: sp.id },
        data: {
          niveau,
          tags,
          interests,
          programmeId: programme.id,
        },
      });

      if (newChapterIds.length === 0) {
        await tx.studentChapterProgress.deleteMany({ where: { studentProfileId: sp.id } });
      } else {
        await tx.studentChapterProgress.deleteMany({
          where: {
            studentProfileId: sp.id,
            chapterId: { notIn: newChapterIds },
          },
        });
      }
    });

    await ensureStudentProgrammeLinkedToCanonical({
      studentProfileId: sp.id,
      niveau,
      programmeIdOnProfile: programme.id,
      programmeRelationId: programme.id,
    });
  } catch {
    return { ok: false, message: "Impossible d’enregistrer pour le moment." };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/programme");
  revalidatePath("/app/programme/seance");

  return { ok: true, message: "Modifications enregistrées." };
}
