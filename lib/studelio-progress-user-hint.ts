import { inferChapterOrdersFromSkills, type ParsedProgrammeGuidedMeta } from "@/lib/programme-guided-meta";
import type { ProgrammeMetaOutcome } from "@/lib/programme-module-progress";
import { metaModulePointsPerChapter, metaRadarPointsPerSkill } from "@/lib/programme-module-progress";

export function studelioProgressHintNoPoints(): string {
  return "Parcours : rien n’a été ajouté cette fois. Continue ta séance, la mise à jour pourra se faire au prochain message d’André.";
}

/** Après un clic raccourci « exercice » / « cours » — pas de crédit tant qu’il n’y a pas de vraie réponse. */
export function studelioProgressHintUiPresetChoice(): string {
  return "Parcours : pas de points pour ce message — c’est seulement ton choix de démarrage. Les points arriveront quand tu répondras à une question ou à un exercice d’André.";
}

function joinFrList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} et ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

function formatModulesPhrase(orders: number[]): string {
  const u = Array.from(new Set(orders)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (u.length === 0) return "";
  if (u.length === 1) return `le module ${u[0]}`;
  return `les modules ${joinFrList(u.map(String))}`;
}

function outcomePraisePrefix(o: ProgrammeMetaOutcome): string {
  switch (o) {
    case "weak":
      return "Petit plus enregistré";
    case "ok":
      return "Bien joué";
    case "good":
      return "Très bien";
    case "excellent":
      return "Bravo";
    default:
      return "Parcours";
  }
}

/**
 * Message vert côté élève : phrases simples, sans jargon serveur (outcome anglais, décimales techniques).
 */
export function studelioProgressHintMeta(meta: ParsedProgrammeGuidedMeta): string {
  const o = meta.outcome;
  const r = metaRadarPointsPerSkill(o);
  const m = metaModulePointsPerChapter(o);
  if (r <= 0 && m <= 0) {
    return "Parcours : pas de points pour cette réponse — tu peux réessayer ou demander un indice à André. Chaque essai compte.";
  }

  const orders =
    meta.chapterOrders.length > 0
      ? meta.chapterOrders
      : meta.skills.length > 0
        ? inferChapterOrdersFromSkills(meta.skills)
        : [];

  const hasSkillGain = meta.skills.length > 0 && r > 0;
  const hasModuleGain = orders.length > 0 && m > 0;
  const skillPhrase = hasSkillGain
    ? meta.skills.length === 1
      ? `la compétence « ${meta.skills[0]} »`
      : `les compétences ${joinFrList(meta.skills.map((s) => `« ${s} »`))}`
    : "";
  const modulePhrase = hasModuleGain ? formatModulesPhrase(orders) : "";

  const prefix = outcomePraisePrefix(o);

  if (hasSkillGain && hasModuleGain) {
    return `Parcours : ${prefix} — ${skillPhrase} et ${modulePhrase} avancent un peu sur ton parcours.`;
  }
  if (hasSkillGain) {
    return `Parcours : ${prefix} — ${skillPhrase} progresse un peu sur ton parcours.`;
  }
  if (hasModuleGain) {
    return `Parcours : ${prefix} — ${modulePhrase} avance un peu sur ton parcours.`;
  }

  return `Parcours : ${prefix} — ton parcours a un peu avancé.`;
}
