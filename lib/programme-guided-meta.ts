import { z } from "zod";

/** Marqueur en fin de message André (séance programme) — retiré avant affichage / stockage. */
export const STUDELIO_META_MARKER = "\n[[STUDELIO_META]]\n";

/** Libellés affichés sur le radar (prompt + JSON META). */
export const COMPETENCY_RADAR_LABELS = [
  "Grammaire",
  "Orthographe",
  "Conjugaison",
  "Vocabulaire",
  "Expression écrite",
  "Lecture",
] as const;

export type CompetencyRadarLabel = (typeof COMPETENCY_RADAR_LABELS)[number];

const labelToDbKey: Record<CompetencyRadarLabel, keyof CompetencyScores> = {
  Grammaire: "grammaire",
  Orthographe: "orthographe",
  Conjugaison: "conjugaison",
  Vocabulaire: "vocabulaire",
  "Expression écrite": "expressionEcrite",
  Lecture: "lecture",
};

export type CompetencyScores = {
  grammaire: number;
  orthographe: number;
  conjugaison: number;
  vocabulaire: number;
  expressionEcrite: number;
  lecture: number;
};

const metaSchema = z.object({
  skills: z.array(z.string()).max(6).optional().default([]),
  chapters: z.array(z.number().int().positive()).max(8).optional().default([]),
});

export type ParsedProgrammeGuidedMeta = {
  skills: CompetencyRadarLabel[];
  chapterOrders: number[];
};

function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Décode les libellés renvoyés par le modèle (tolère accents / casse). */
export function normalizeSkillToLabel(raw: string): CompetencyRadarLabel | null {
  const t = fold(raw);
  const map: [string, CompetencyRadarLabel][] = [
    ["grammaire", "Grammaire"],
    ["orthographe", "Orthographe"],
    ["conjugaison", "Conjugaison"],
    ["vocabulaire", "Vocabulaire"],
    ["expression ecrite", "Expression écrite"],
    ["expressionecrite", "Expression écrite"],
    ["redaction", "Expression écrite"],
    ["ecriture", "Expression écrite"],
    ["lecture", "Lecture"],
  ];
  for (const [needle, label] of map) {
    if (t === needle) return label;
  }
  return null;
}

export function labelToPrismaField(label: CompetencyRadarLabel): keyof CompetencyScores {
  return labelToDbKey[label];
}

const META_TAG = "[[STUDELIO_META]]";

/** Affichage (streaming ou anciens messages) : coupe tout à partir du marqueur META. */
export function previewWithoutMetaTail(text: string): string {
  const i = text.indexOf(META_TAG);
  if (i < 0) return text;
  return text.slice(0, i).trimEnd();
}

/**
 * Retire le bloc META de fin si présent et valide ; sinon renvoie le texte tel quel (pas de meta).
 */
export function stripProgrammeGuidedMeta(raw: string): { content: string; meta: ParsedProgrammeGuidedMeta | null } {
  const idx = raw.lastIndexOf(META_TAG);
  if (idx < 0) {
    return { content: raw.trim(), meta: null };
  }
  const jsonPart = raw.slice(idx + META_TAG.length).trim();
  const content = raw.slice(0, idx).trimEnd();
  try {
    const parsed = metaSchema.safeParse(JSON.parse(jsonPart));
    if (!parsed.success) {
      return { content: raw.trim(), meta: null };
    }
    const skills: CompetencyRadarLabel[] = [];
    const seen = new Set<CompetencyRadarLabel>();
    for (const s of parsed.data.skills) {
      const lab = normalizeSkillToLabel(s);
      if (lab && !seen.has(lab)) {
        seen.add(lab);
        skills.push(lab);
      }
    }
    const chapterOrders = Array.from(new Set(parsed.data.chapters)).filter((n) => Number.isFinite(n) && n > 0);
    if (skills.length === 0 && chapterOrders.length === 0) {
      return { content: raw.trim(), meta: null };
    }
    return { content: content.trim(), meta: { skills, chapterOrders } };
  } catch {
    return { content: raw.trim(), meta: null };
  }
}
