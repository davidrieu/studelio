"use server";

import { ChapterProgressStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  chapterId: z.string().min(1),
  status: z.nativeEnum(ChapterProgressStatus),
});

export async function setChapterProgress(
  chapterId: string,
  status: ChapterProgressStatus,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return { ok: false, message: "Non autorisé." };
  }

  const parsed = inputSchema.safeParse({ chapterId, status });
  if (!parsed.success) {
    return { ok: false, message: "Données invalides." };
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, programmeId: true },
  });

  if (!profile?.programmeId) {
    return { ok: false, message: "Aucun programme assigné." };
  }

  const chapter = await prisma.programmeChapter.findFirst({
    where: { id: parsed.data.chapterId, programmeId: profile.programmeId },
    select: { id: true },
  });

  if (!chapter) {
    return { ok: false, message: "Chapitre introuvable." };
  }

  await prisma.studentChapterProgress.upsert({
    where: {
      studentProfileId_chapterId: {
        studentProfileId: profile.id,
        chapterId: chapter.id,
      },
    },
    create: {
      studentProfileId: profile.id,
      chapterId: chapter.id,
      status: parsed.data.status,
    },
    update: { status: parsed.data.status },
  });

  revalidatePath("/app/programme");
  revalidatePath("/app/dashboard");
  return { ok: true };
}
