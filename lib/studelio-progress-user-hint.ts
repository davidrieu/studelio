import type { ParsedProgrammeGuidedMeta } from "@/lib/programme-guided-meta";
import {
  MODULE_META_BUMP_PER_CHAPTER,
  MODULE_MICRO_BUMP_PER_EXCHANGE,
  RADAR_META_SKILL_DELTA,
  RADAR_MICRO_PER_AXIS_EXCHANGE,
} from "@/lib/programme-module-progress";

/** Texte court affiché à l’élève après la réponse (cohérent avec les constantes serveur). */
export function studelioProgressHintMicro(): string {
  return `Parcours Studelio : +${RADAR_MICRO_PER_AXIS_EXCHANGE} pts sur chaque axe du radar ; +${MODULE_MICRO_BUMP_PER_EXCHANGE} % sur la barre du module suivi. Ouvre « Parcours & progression » pour voir les barres.`;
}

export function studelioProgressHintMeta(meta: ParsedProgrammeGuidedMeta): string {
  if (meta.skills.length === 0 && meta.chapterOrders.length === 0) {
    return "Parcours Studelio : enregistrement pris en compte — ouvre « Parcours & progression » pour le détail.";
  }
  const radar =
    meta.skills.length > 0
      ? `radar +${RADAR_META_SKILL_DELTA} pts sur : ${meta.skills.join(", ")}`
      : "radar inchangé (aucune compétence listée)";
  const bars =
    meta.chapterOrders.length > 0
      ? `barres modules +${MODULE_META_BUMP_PER_CHAPTER} % sur les n° ${meta.chapterOrders.join(", ")}`
      : "barres modules inchangées (aucun module listé)";
  return `Parcours Studelio — ${radar} ; ${bars}.`;
}
