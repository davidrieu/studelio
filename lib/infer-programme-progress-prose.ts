import {
  COMPETENCY_RADAR_LABELS,
  inferChapterOrdersFromSkills,
  normalizeSkillToLabel,
  type CompetencyRadarLabel,
  type ParsedProgrammeGuidedMeta,
} from "@/lib/programme-guided-meta";
import { STUDELIO_STANDARD_MODULES_DEF } from "@/lib/studelio-standard-modules";

const MAX_MODULE = STUDELIO_STANDARD_MODULES_DEF.reduce((m, d) => Math.max(m, d.order), 0);

const FAIL_TAIL =
  /\b(pas (tout )?à fait|pas encore|incorrect|dommage|essa(y|i)e encore|ce n'est pas|ce n’est pas|faux|erreur|incomplet|insuffisant|raté|échou|echou|non,|tu te trompes)\b/i;

/**
 * Secours minimal si le JSON META manque mais qu’André annonce un crédit Studelio **sans** signal d’échec dans le même passage.
 * Toujours traité comme **weak** (0.1 pt) côté serveur — préfère le JSON avec \`outcome\`.
 */
export function inferProgrammeProgressProseFallback(assistantText: string): ParsedProgrammeGuidedMeta | null {
  const tail = assistantText.slice(-1400);

  if (FAIL_TAIL.test(tail)) return null;

  const triggered =
    /\bstudelio\b[\s\S]{0,160}\b(cr[eé]dit|credits?|credit|coche|enregistr|attribu|avance|points?|bonus)\b/i.test(
      tail,
    ) ||
    /\b(cr[eé]dit|credits?|credit)\b[\s\S]{0,80}\bstudelio\b/i.test(tail) ||
    /\bc[oô]t[eé]\s+suivi\b/i.test(tail);

  if (!triggered) return null;

  const seenSkill = new Set<CompetencyRadarLabel>();
  const skills: CompetencyRadarLabel[] = [];
  const orderedLabels = [...COMPETENCY_RADAR_LABELS].sort((a, b) => b.length - a.length);
  for (const lab of orderedLabels) {
    const pattern =
      lab === "Expression écrite"
        ? "\\bExpression\\s+écrite\\b"
        : `\\b${lab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`;
    const re = new RegExp(pattern, "i");
    if (re.test(tail) && !seenSkill.has(lab)) {
      seenSkill.add(lab);
      skills.push(lab);
    }
  }

  const seenCh = new Set<number>();
  const chapterOrders: number[] = [];
  const chRes = [
    /\bmodule\s*n?[°o]?\s*(\d)\b/gi,
    /\b(?:le|du|au)\s+module\s+(\d)\b/gi,
    /\bmodules?\s+(\d)\b/gi,
  ];
  for (const re of chRes) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(tail)) !== null) {
      const n = Number.parseInt(m[1] ?? "", 10);
      if (Number.isFinite(n) && n >= 1 && n <= MAX_MODULE && !seenCh.has(n)) {
        seenCh.add(n);
        chapterOrders.push(n);
      }
    }
  }

  let outSkills = skills;
  let outChapters = chapterOrders;

  if (outSkills.length > 0 && outChapters.length === 0) {
    outChapters = inferChapterOrdersFromSkills(outSkills).filter((o) => o >= 1 && o <= MAX_MODULE);
  }

  if (outChapters.length > 0 && outSkills.length === 0) {
    const seen = new Set<CompetencyRadarLabel>();
    const fromMod: CompetencyRadarLabel[] = [];
    for (const ord of outChapters) {
      const mod = STUDELIO_STANDARD_MODULES_DEF.find((m) => m.order === ord);
      const rawSkill = mod?.skills[0];
      if (!rawSkill) continue;
      const lab =
        normalizeSkillToLabel(rawSkill) ??
        ((COMPETENCY_RADAR_LABELS as readonly string[]).includes(rawSkill) ? (rawSkill as CompetencyRadarLabel) : null);
      if (lab && !seen.has(lab)) {
        seen.add(lab);
        fromMod.push(lab);
      }
    }
    outSkills = fromMod;
  }

  if (outSkills.length === 0 && outChapters.length === 0) return null;

  return { skills: outSkills, chapterOrders: outChapters, outcome: "weak" };
}
