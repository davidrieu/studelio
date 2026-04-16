import { z } from "zod";
import { STUDELIO_STANDARD_MODULES_DEF } from "@/lib/studelio-standard-modules";

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
  chapters: z.array(z.coerce.number().int().positive()).max(8).optional().default([]),
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

const META_FULL = "\n[[STUDELIO_META]]\n";
const META_COMPACT = "[[STUDELIO_META]]";

function findLastMetaIndex(raw: string): number {
  const full = raw.lastIndexOf(META_FULL);
  if (full >= 0) return full;
  return raw.lastIndexOf(META_COMPACT);
}

function sliceAfterMeta(raw: string, idx: number): string {
  if (raw.slice(idx, idx + META_FULL.length) === META_FULL) {
    return raw.slice(idx + META_FULL.length);
  }
  return raw.slice(idx + META_COMPACT.length);
}

function unwrapJsonPayload(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

/** Si le JSON ne liste pas `skills` mais des `chapters`, on déduit les axes radar depuis les modules Studelio. */
function inferSkillsFromChapterOrders(
  chapterOrders: number[],
  seen: Set<CompetencyRadarLabel>,
  out: CompetencyRadarLabel[],
): void {
  for (const ord of chapterOrders) {
    const mod = STUDELIO_STANDARD_MODULES_DEF.find((m) => m.order === ord);
    const rawSkill = mod?.skills[0];
    if (!rawSkill) continue;
    const lab =
      normalizeSkillToLabel(rawSkill) ??
      ((COMPETENCY_RADAR_LABELS as readonly string[]).includes(rawSkill) ? (rawSkill as CompetencyRadarLabel) : null);
    if (lab && !seen.has(lab)) {
      seen.add(lab);
      out.push(lab);
    }
  }
}

/** Affichage (streaming ou anciens messages) : coupe tout à partir du marqueur META. */
export function previewWithoutMetaTail(text: string): string {
  const i = findLastMetaIndex(text);
  if (i < 0) return text;
  return text.slice(0, i).trimEnd();
}

/**
 * Retire le bloc META de fin si présent et valide ; sinon renvoie le texte tel quel (pas de meta).
 */
export function stripProgrammeGuidedMeta(raw: string): { content: string; meta: ParsedProgrammeGuidedMeta | null } {
  const idx = findLastMetaIndex(raw);
  if (idx < 0) {
    return { content: raw.trim(), meta: null };
  }
  const jsonPart = unwrapJsonPayload(sliceAfterMeta(raw, idx).trim());
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

    if (skills.length === 0 && chapterOrders.length > 0) {
      inferSkillsFromChapterOrders(chapterOrders, seen, skills);
    }

    if (skills.length === 0 && chapterOrders.length === 0) {
      return { content: raw.trim(), meta: null };
    }
    return { content: content.trim(), meta: { skills, chapterOrders } };
  } catch {
    return { content: raw.trim(), meta: null };
  }
}
