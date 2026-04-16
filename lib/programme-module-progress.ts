import type { ChapterProgressStatus } from "@prisma/client";

/**
 * Unités affichées comme % de barre (0–99 en cours, 100 = module terminé).
 * Chaque échange sans META ajoute `MODULE_MICRO_BUMP_PER_EXCHANGE` ; le META ajoute
 * `MODULE_META_BUMP_PER_CHAPTER` par module cité.
 */
export const MODULE_COMPLETION_UNITS = 100;

/** @deprecated alias — garder pour imports historiques ; valeur = plafond unités. */
export const MODULE_COMPLETION_META_HITS = MODULE_COMPLETION_UNITS;

/** Sans bloc META : progression visible à chaque réponse d’André sur le module suivi. */
export const MODULE_MICRO_BUMP_PER_EXCHANGE = 4;

/** Avec META : bonus par numéro de module cité dans le JSON. */
export const MODULE_META_BUMP_PER_CHAPTER = 12;

/** Sans META : points radar ajoutés sur chaque axe à chaque échange. */
export const RADAR_MICRO_PER_AXIS_EXCHANGE = 2;

/** Avec META : points radar ajoutés par compétence citée dans le JSON. */
export const RADAR_META_SKILL_DELTA = 10;

export function moduleProgressPercent(status: ChapterProgressStatus, programmeMetaHits: number): number {
  if (status === "COMPLETED") return 100;
  if (status === "NOT_STARTED") return 0;
  const h = Math.max(0, programmeMetaHits);
  const pct = Math.min(100, (h / MODULE_COMPLETION_UNITS) * 100);
  return Math.min(99, Math.round(pct * 10) / 10);
}
