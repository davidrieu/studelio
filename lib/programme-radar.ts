import type { ChapterProgressStatus } from "@prisma/client";

export type ProgrammeChapterForRadar = {
  id: string;
  title: string;
  skills: string[];
};

export type ProgressByChapter = Record<string, ChapterProgressStatus | undefined>;

/** Pour chaque compétence (max `maxSkills`), % de chapitres couverts — terminé = 100 % du segment, en cours = 50 %. */
export function buildSkillRadarData(
  chapters: ProgrammeChapterForRadar[],
  progress: ProgressByChapter,
  maxSkills = 6,
): { subject: string; value: number; fullMark: number }[] {
  const skillToChapterIds = new Map<string, Set<string>>();

  for (const ch of chapters) {
    const labels = ch.skills.length > 0 ? ch.skills : [ch.title.slice(0, 28)];
    for (const raw of labels) {
      const subject = raw.trim() || "Parcours";
      if (!skillToChapterIds.has(subject)) skillToChapterIds.set(subject, new Set());
      skillToChapterIds.get(subject)!.add(ch.id);
    }
  }

  const orderedSubjects = Array.from(skillToChapterIds.keys()).slice(0, maxSkills);

  return orderedSubjects.map((subject) => {
    const ids = Array.from(skillToChapterIds.get(subject)!);
    const total = ids.length;
    let score = 0;
    for (const id of ids) {
      const s = progress[id];
      if (s === "COMPLETED") score += 1;
      else if (s === "IN_PROGRESS") score += 0.5;
    }
    const value = total ? Math.round((score / total) * 100) : 0;
    return { subject, value, fullMark: 100 };
  });
}

export function countChapterStats(
  chapterIds: string[],
  progress: ProgressByChapter,
): { completed: number; inProgress: number; notStarted: number } {
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;
  for (const id of chapterIds) {
    const s = progress[id];
    if (s === "COMPLETED") completed += 1;
    else if (s === "IN_PROGRESS") inProgress += 1;
    else notStarted += 1;
  }
  return { completed, inProgress, notStarted };
}
