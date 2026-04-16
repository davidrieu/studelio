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
  const t = fold(raw)
    .replace(/[.!?;:]+$/g, "")
    .replace(/^[^a-zà-ÿ0-9]+/i, "");
  const map: [string, CompetencyRadarLabel][] = [
    ["grammaire", "Grammaire"],
    ["la grammaire", "Grammaire"],
    ["orthographe", "Orthographe"],
    ["l orthographe", "Orthographe"],
    ["conjugaison", "Conjugaison"],
    ["la conjugaison", "Conjugaison"],
    ["vocabulaire", "Vocabulaire"],
    ["le vocabulaire", "Vocabulaire"],
    ["expression ecrite", "Expression écrite"],
    ["expressionecrite", "Expression écrite"],
    ["redaction", "Expression écrite"],
    ["la redaction", "Expression écrite"],
    ["ecriture", "Expression écrite"],
    ["lecture", "Lecture"],
    ["la lecture", "Lecture"],
  ];
  for (const [needle, label] of map) {
    if (t === needle) return label;
  }
  const en: [string, CompetencyRadarLabel][] = [
    ["grammar", "Grammaire"],
    ["spelling", "Orthographe"],
    ["conjugation", "Conjugaison"],
    ["vocabulary", "Vocabulaire"],
    ["reading", "Lecture"],
    ["writing", "Expression écrite"],
    ["written expression", "Expression écrite"],
    ["written comprehension", "Lecture"],
  ];
  for (const [needle, label] of en) {
    if (t === needle) return label;
  }
  return null;
}

export function labelToPrismaField(label: CompetencyRadarLabel): keyof CompetencyScores {
  return labelToDbKey[label];
}

/** Dernière occurrence du marqueur (tolère espaces, casse, tiret / underscore, \r\n). */
const META_BLOCK_RE = /\[\[\s*STUDELIO\s*[-_]?\s*META\s*\]\]/gi;

function findLastMetaBlock(raw: string): { blockStart: number; blockEnd: number } | null {
  let last: { blockStart: number; blockEnd: number } | null = null;
  META_BLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = META_BLOCK_RE.exec(raw)) !== null) {
    last = { blockStart: m.index, blockEnd: m.index + m[0].length };
  }
  return last;
}

function unwrapJsonPayload(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

/** Extrait le premier objet JSON `{ ... }` (le modèle ajoute parfois du texte avant/après). */
function extractFirstJsonObject(raw: string): string | null {
  const t = raw.trim();
  const start = t.indexOf("{");
  if (start < 0) return null;
  const end = t.lastIndexOf("}");
  if (end <= start) return null;
  return t.slice(start, end + 1);
}

function sanitizeJsonForParse(s: string): string {
  return s
    .replace(/\u201c|\u201d|\u00ab|\u00bb/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,(\s*[}\]])/g, "$1");
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

/** Si le JSON ne liste pas `chapters` mais des `skills`, alignement sur les 6 modules Studelio (ordre 1–6). */
export function inferChapterOrdersFromSkills(skills: readonly CompetencyRadarLabel[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const lab of skills) {
    const mod = STUDELIO_STANDARD_MODULES_DEF.find((m) => {
      const raw = m.skills[0];
      const asLab =
        normalizeSkillToLabel(raw) ??
        ((COMPETENCY_RADAR_LABELS as readonly string[]).includes(raw) ? (raw as CompetencyRadarLabel) : null);
      return asLab === lab;
    });
    if (mod && !seen.has(mod.order)) {
      seen.add(mod.order);
      out.push(mod.order);
    }
  }
  return out;
}

/** Affichage (streaming ou anciens messages) : coupe tout à partir du marqueur META. */
export function previewWithoutMetaTail(text: string): string {
  const span = findLastMetaBlock(text);
  if (!span) return text;
  return text.slice(0, span.blockStart).trimEnd();
}

/**
 * Retire le bloc META de fin si présent et valide ; sinon renvoie le texte tel quel (pas de meta).
 */
export function stripProgrammeGuidedMeta(raw: string): { content: string; meta: ParsedProgrammeGuidedMeta | null } {
  const span = findLastMetaBlock(raw);
  if (!span) {
    return { content: raw.trim(), meta: null };
  }
  const afterMarker = raw.slice(span.blockEnd).trim();
  const unwrapped = unwrapJsonPayload(afterMarker);
  const jsonPart = extractFirstJsonObject(unwrapped) ?? unwrapped;
  const content = raw.slice(0, span.blockStart).trimEnd();
  try {
    const parsed = metaSchema.safeParse(JSON.parse(sanitizeJsonForParse(jsonPart)));
    if (!parsed.success) {
      return { content: content.trim(), meta: null };
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
    let chapterOrders = Array.from(new Set(parsed.data.chapters)).filter((n) => Number.isFinite(n) && n > 0);

    if (skills.length === 0 && chapterOrders.length > 0) {
      inferSkillsFromChapterOrders(chapterOrders, seen, skills);
    }
    if (chapterOrders.length === 0 && skills.length > 0) {
      chapterOrders = inferChapterOrdersFromSkills(skills);
    }

    const maxModuleOrder = STUDELIO_STANDARD_MODULES_DEF.reduce((acc, m) => Math.max(acc, m.order), 0);
    chapterOrders = chapterOrders.filter((o) => Number.isInteger(o) && o >= 1 && o <= maxModuleOrder);

    if (skills.length === 0 && chapterOrders.length > 0) {
      inferSkillsFromChapterOrders(chapterOrders, seen, skills);
    }
    if (chapterOrders.length === 0 && skills.length > 0) {
      chapterOrders = inferChapterOrdersFromSkills(skills);
      chapterOrders = chapterOrders.filter((o) => o >= 1 && o <= maxModuleOrder);
    }

    if (skills.length === 0 && chapterOrders.length === 0) {
      return { content: content.trim(), meta: null };
    }
    return { content: content.trim(), meta: { skills, chapterOrders } };
  } catch {
    return { content: content.trim(), meta: null };
  }
}
