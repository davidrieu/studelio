"use server";

import { Tag } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mergeInterestsFromFormFields, normalizeSuggestedInterestPicks } from "@/lib/student-interests-form";

const onboardingSchema = z.object({
  tags: z.array(z.nativeEnum(Tag)).max(10),
  interestsPicked: z.array(z.string()).max(20),
  interestsExtra: z.string().max(500).optional(),
});

export type OnboardingState =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function completeOnboardingAction(
  _: OnboardingState | undefined,
  formData: FormData,
): Promise<OnboardingState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return { ok: false, message: "Tu dois être connecté en tant qu’élève." };
  }

  const rawTags = formData.getAll("tags").filter((v): v is string => typeof v === "string");
  const rawPicked = formData.getAll("interests").filter((v): v is string => typeof v === "string");
  const extra = (formData.get("interestsExtra") as string | null) ?? undefined;

  const interestsPicked = normalizeSuggestedInterestPicks(rawPicked);

  const parsed = onboardingSchema.safeParse({
    tags: rawTags,
    interestsPicked,
    interestsExtra: extra,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { ok: false, message: "Vérifie les champs du formulaire.", fieldErrors };
  }

  const interests = mergeInterestsFromFormFields(parsed.data.interestsPicked, parsed.data.interestsExtra);

  try {
    await prisma.studentProfile.update({
      where: { userId: session.user.id },
      data: {
        tags: parsed.data.tags,
        interests,
        onboardingCompletedAt: new Date(),
      },
    });
  } catch {
    return { ok: false, message: "Impossible d’enregistrer pour le moment." };
  }

  return { ok: true };
}
