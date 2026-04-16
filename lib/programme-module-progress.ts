import type { ChapterProgressStatus } from "@prisma/client";

/**
 * Nombre de messages de séance programme (META avec ce module dans `chapters`) pour passer
 * de « en cours » à « terminé ». Le premier passage NOT_STARTED → IN_PROGRESS compte déjà 1.
 */
export const MODULE_COMPLETION_META_HITS = 4;

export function moduleProgressPercent(status: ChapterProgressStatus, programmeMetaHits: number): number {
  if (status === "COMPLETED") return 100;
  if (status === "NOT_STARTED") return 0;
  const h = Math.max(0, programmeMetaHits);
  return Math.min(100, Math.round((h / MODULE_COMPLETION_META_HITS) * 100));
}
