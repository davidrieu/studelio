import {
  inferChapterOrdersFromSkills,
  labelToPrismaField,
  type CompetencyScores,
  type ParsedProgrammeGuidedMeta,
} from "@/lib/programme-guided-meta";
import {
  MODULE_META_BUMP_PER_CHAPTER,
  MODULE_MICRO_BUMP_PER_EXCHANGE,
  RADAR_META_SKILL_DELTA,
  RADAR_MICRO_PER_AXIS_EXCHANGE,
} from "@/lib/programme-module-progress";

const RADAR_KEYS: (keyof CompetencyScores)[] = [
  "grammaire",
  "orthographe",
  "conjugaison",
  "vocabulaire",
  "expressionEcrite",
  "lecture",
];

/** Envoyé au client après chaque réponse André (séance programme) pour badges + total session. */
export type StudelioProgressDeltaPayload = {
  kind: "meta" | "prose" | "micro";
  /** Points radar ajoutés ce tour (axe → Δ). */
  radarDelta: Partial<Record<keyof CompetencyScores, number>>;
  /** Unités barre module (échelle interne 0–100). `order` 0 = bonus « module suivi » automatique. */
  moduleDeltas: { order: number; units: number }[];
  /** Score unique pour l’animation « +N » (somme des Δ affichés). */
  displayPoints: number;
  /** Une ligne lisible (sous le +N). */
  summaryLine: string;
};

function sumRadar(d: Partial<Record<keyof CompetencyScores, number>>): number {
  return RADAR_KEYS.reduce((acc, k) => acc + (d[k] ?? 0), 0);
}

export function buildStudelioProgressDeltaFromMeta(
  meta: ParsedProgrammeGuidedMeta,
  kind: "meta" | "prose",
): StudelioProgressDeltaPayload {
  const radarDelta: Partial<Record<keyof CompetencyScores, number>> = {};
  for (const lab of meta.skills) {
    const k = labelToPrismaField(lab);
    radarDelta[k] = (radarDelta[k] ?? 0) + RADAR_META_SKILL_DELTA;
  }
  const orders =
    meta.chapterOrders.length > 0 ? meta.chapterOrders : inferChapterOrdersFromSkills(meta.skills);
  const moduleDeltas = orders.map((order) => ({ order, units: MODULE_META_BUMP_PER_CHAPTER }));
  const displayPoints = sumRadar(radarDelta) + moduleDeltas.reduce((a, m) => a + m.units, 0);
  const bits: string[] = [];
  if (meta.skills.length) bits.push(`radar (${meta.skills.length})`);
  if (orders.length) bits.push(`modules (${orders.length})`);
  const summaryLine =
    bits.length > 0 ? `Parcours : ${bits.join(" · ")}` : "Parcours : bonus enregistré";
  return { kind, radarDelta, moduleDeltas, displayPoints, summaryLine };
}

export function buildStudelioProgressDeltaMicro(): StudelioProgressDeltaPayload {
  const radarDelta: Partial<Record<keyof CompetencyScores, number>> = {};
  for (const k of RADAR_KEYS) {
    radarDelta[k] = RADAR_MICRO_PER_AXIS_EXCHANGE;
  }
  const moduleDeltas = [{ order: 0, units: MODULE_MICRO_BUMP_PER_EXCHANGE }];
  const displayPoints = sumRadar(radarDelta) + MODULE_MICRO_BUMP_PER_EXCHANGE;
  return {
    kind: "micro",
    radarDelta,
    moduleDeltas,
    displayPoints,
    summaryLine: "Parcours : micro-bonus radar + module suivi",
  };
}

export function isStudelioProgressDeltaPayload(v: unknown): v is StudelioProgressDeltaPayload {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.kind !== "meta" && o.kind !== "prose" && o.kind !== "micro") return false;
  if (typeof o.displayPoints !== "number" || !Number.isFinite(o.displayPoints)) return false;
  if (typeof o.summaryLine !== "string") return false;
  if (!o.radarDelta || typeof o.radarDelta !== "object") return false;
  if (!Array.isArray(o.moduleDeltas)) return false;
  return true;
}
