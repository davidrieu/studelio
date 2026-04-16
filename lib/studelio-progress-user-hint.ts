import { inferChapterOrdersFromSkills, type ParsedProgrammeGuidedMeta } from "@/lib/programme-guided-meta";
import { metaModulePointsPerChapter, metaRadarPointsPerSkill } from "@/lib/programme-module-progress";

export function studelioProgressHintNoPoints(): string {
  return "Parcours : aucun point sans bloc [[STUDELIO_META]] + JSON (avec le résultat `outcome`). Demande à André de compléter la fin du message.";
}

/** Après un clic raccourci « exercice » / « cours » — pas de crédit tant qu’il n’y a pas de vraie réponse. */
export function studelioProgressHintUiPresetChoice(): string {
  return "Parcours : pas de points pour ce message — c’est seulement ton choix de démarrage. Les points arriveront quand tu répondras à une question ou à un exercice d’André.";
}

export function studelioProgressHintMeta(meta: ParsedProgrammeGuidedMeta): string {
  const o = meta.outcome;
  const r = metaRadarPointsPerSkill(o);
  const m = metaModulePointsPerChapter(o);
  if (r <= 0 && m <= 0) {
    return "Parcours Studelio : pas de points sur ce message (réponse à retravailler). Continue comme ça, la prochaine sera la bonne.";
  }
  const radar =
    meta.skills.length > 0 && r > 0
      ? `radar +${r} par compétence : ${meta.skills.join(", ")}`
      : "radar inchangé";
  const orders =
    meta.chapterOrders.length > 0
      ? meta.chapterOrders
      : meta.skills.length > 0
        ? inferChapterOrdersFromSkills(meta.skills)
        : [];
  const bars =
    orders.length > 0 && m > 0
      ? `barres modules +${m} par module n° ${orders.join(", ")}`
      : "barres modules inchangées";
  return `Parcours Studelio (${o}) — ${radar} ; ${bars}.`;
}
