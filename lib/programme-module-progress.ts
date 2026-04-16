import type { ChapterProgressStatus } from "@prisma/client";

/**
 * Unités barre module (0–100). Les gains META s’ajoutent en décimal pour rester modestes sur plusieurs mois.
 */
export const MODULE_COMPLETION_UNITS = 100;

/** @deprecated alias — garder pour imports historiques ; valeur = plafond unités. */
export const MODULE_COMPLETION_META_HITS = MODULE_COMPLETION_UNITS;

/** Résultat de la dernière réponse élève (obligatoire dans le JSON META). */
export type ProgrammeMetaOutcome = "fail" | "weak" | "ok" | "good" | "excellent";

/** Points radar (échelle 0–100) ajoutés **par compétence citée** selon la qualité de la réponse. */
export function metaRadarPointsPerSkill(outcome: ProgrammeMetaOutcome | null): number {
  const o = outcome ?? "fail";
  switch (o) {
    case "fail":
      return 0;
    case "weak":
      return 0.1;
    case "ok":
      return 0.3;
    case "good":
      return 0.5;
    case "excellent":
      return 1;
    default:
      return 0;
  }
}

/** Points barre module (0–100) par module cité : un peu moins que le radar pour équilibrer. */
export function metaModulePointsPerChapter(outcome: ProgrammeMetaOutcome | null): number {
  const r = metaRadarPointsPerSkill(outcome);
  if (r <= 0) return 0;
  return Math.min(1.5, r * 0.85);
}

export function moduleProgressPercent(status: ChapterProgressStatus, programmeMetaHits: number): number {
  if (status === "COMPLETED") return 100;
  if (status === "NOT_STARTED") return 0;
  const h = Math.max(0, programmeMetaHits);
  const pct = Math.min(100, (h / MODULE_COMPLETION_UNITS) * 100);
  return Math.min(99, Math.round(pct * 10) / 10);
}
