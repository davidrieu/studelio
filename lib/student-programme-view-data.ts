import type { ChapterProgressStatus, Niveau } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bootstrapGuidedProgressHistoryOnce } from "@/lib/bootstrap-guided-progress-history";
import { ensureProgrammeStandardModules } from "@/lib/ensure-programme-standard-modules";
import { findStudentChapterProgressRowsSafe } from "@/lib/load-student-chapter-progress-safe";
import { loadStudentCompetencyScoresSafe } from "@/lib/load-student-competency-scores";
import type { CompetencyScores } from "@/lib/programme-guided-meta";
import { ensureStudentProgrammeLinkedToCanonical } from "@/lib/student-programme-canonical";

export type ProgrammeViewChapter = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  objectives: string[];
  skills: string[];
};

export type ProgrammeViewDictation = {
  id: string;
  title: string;
  audioUrl: string;
  order: number;
};

export type ProgrammeViewPayload = {
  ok: true;
  updatedAt: string;
  programmeTitle: string;
  programmeDescription: string | null;
  dictations: ProgrammeViewDictation[];
  chapters: ProgrammeViewChapter[];
  chapterProgress: Record<string, { status: ChapterProgressStatus; programmeMetaHits: number }>;
  competencyScores: CompetencyScores | null;
};

export type ProgrammeViewError = {
  ok: false;
  code: "no_profile" | "no_content";
  message: string;
  niveau?: Niveau;
};

/**
 * Données affichées sur la page Parcours (radar + modules) — même source que la persistance chat guidé.
 * Rejoue une fois l’historique guidé (`bootstrapGuidedProgressHistoryOnce`, no-op si déjà fait) pour aligner
 * radar / barres après sync ou ouverture API sans repasser par le SSR de la page.
 */
export async function getStudentProgrammeViewData(userId: string): Promise<ProgrammeViewPayload | ProgrammeViewError> {
  let profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      programme: {
        include: {
          chapters: { orderBy: { order: "asc" } },
          dictations: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, audioUrl: true, order: true },
          },
        },
      },
    },
  });

  if (!profile) {
    return { ok: false, code: "no_profile", message: "Profil introuvable." };
  }

  await ensureStudentProgrammeLinkedToCanonical({
    studentProfileId: profile.id,
    niveau: profile.niveau,
    programmeIdOnProfile: profile.programmeId,
    programmeRelationId: profile.programme?.id ?? null,
  });

  profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      programme: {
        include: {
          chapters: { orderBy: { order: "asc" } },
          dictations: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, audioUrl: true, order: true },
          },
        },
      },
    },
  });

  if (!profile) {
    return { ok: false, code: "no_profile", message: "Profil introuvable." };
  }

  const prog = profile.programme;
  const dictations = prog?.dictations ?? [];

  let chapters = prog?.chapters ?? [];
  if (prog?.id) {
    await ensureProgrammeStandardModules(prog.id);
    chapters = await prisma.programmeChapter.findMany({
      where: { programmeId: prog.id },
      orderBy: { order: "asc" },
    });
    try {
      await bootstrapGuidedProgressHistoryOnce({
        studentProfileId: profile.id,
        userId,
        programmeId: prog.id,
      });
    } catch (e) {
      console.error("[programme-view] bootstrap guided progress history", e);
    }
  }

  const hasChapters = chapters.length > 0;
  const hasDictations = dictations.length > 0;

  if (!prog || (!hasChapters && !hasDictations)) {
    return {
      ok: false,
      code: "no_content",
      message: "Aucun programme ou dictée pour ce niveau.",
      niveau: profile.niveau,
    };
  }

  const progressRows = hasChapters
    ? await findStudentChapterProgressRowsSafe(profile.id, chapters.map((c) => c.id))
    : [];

  const chapterProgress: Record<string, { status: ChapterProgressStatus; programmeMetaHits: number }> = {};
  for (const row of progressRows) {
    chapterProgress[row.chapterId] = {
      status: row.status,
      programmeMetaHits: row.programmeMetaHits,
    };
  }

  const competencyScores = await loadStudentCompetencyScoresSafe(profile.id);

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    programmeTitle: prog.title,
    programmeDescription: prog.description,
    dictations,
    chapters: chapters.map((c) => ({
      id: c.id,
      order: c.order,
      title: c.title,
      description: c.description,
      objectives: c.objectives,
      skills: c.skills,
    })),
    chapterProgress,
    competencyScores,
  };
}
