import {
  inferChapterOrdersFromSkills,
  labelToPrismaField,
  type CompetencyScores,
  type ParsedProgrammeGuidedMeta,
} from "@/lib/programme-guided-meta";
import { metaModulePointsPerChapter, metaRadarPointsPerSkill } from "@/lib/programme-module-progress";

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
  kind: "meta" | "prose";
  radarDelta: Partial<Record<keyof CompetencyScores, number>>;
  moduleDeltas: { order: number; units: number }[];
  displayPoints: number;
  summaryLine: string;
};

function sumRadar(d: Partial<Record<keyof CompetencyScores, number>>): number {
  return RADAR_KEYS.reduce((acc, k) => acc + (d[k] ?? 0), 0);
}

export function buildStudelioProgressDeltaFromMeta(
  meta: ParsedProgrammeGuidedMeta,
  kind: "meta" | "prose",
): StudelioProgressDeltaPayload {
  const o = meta.outcome;
  const rSkill = metaRadarPointsPerSkill(o);
  const rMod = metaModulePointsPerChapter(o);

  const radarDelta: Partial<Record<keyof CompetencyScores, number>> = {};
  for (const lab of meta.skills) {
    const k = labelToPrismaField(lab);
    radarDelta[k] = (radarDelta[k] ?? 0) + rSkill;
  }
  const orders =
    meta.chapterOrders.length > 0 ? meta.chapterOrders : inferChapterOrdersFromSkills(meta.skills);
  const moduleDeltas = orders.map((order) => ({ order, units: rMod }));
  const displayPoints = Math.round((sumRadar(radarDelta) + moduleDeltas.reduce((a, m) => a + m.units, 0)) * 100) / 100;
  const bits: string[] = [];
  if (rSkill > 0 && meta.skills.length) bits.push(`radar +${rSkill}/axe × ${meta.skills.length}`);
  if (rMod > 0 && orders.length) bits.push(`modules +${rMod} × ${orders.length}`);
  const summaryLine =
    bits.length > 0 ? `Parcours (${o}) : ${bits.join(" · ")}` : `Parcours (${o}) : pas de points`;
  return { kind, radarDelta, moduleDeltas, displayPoints, summaryLine };
}

export function isStudelioProgressDeltaPayload(v: unknown): v is StudelioProgressDeltaPayload {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.kind !== "meta" && o.kind !== "prose") return false;
  if (typeof o.displayPoints !== "number" || !Number.isFinite(o.displayPoints)) return false;
  if (typeof o.summaryLine !== "string") return false;
  if (!o.radarDelta || typeof o.radarDelta !== "object") return false;
  if (!Array.isArray(o.moduleDeltas)) return false;
  return true;
}
