/**
 * Textes envoyés par les boutons « Faire l’exercice proposé » / « Parler du cours »
 * (séance programme guidée). Doivent rester alignés avec `lib/andre-prompt-guided.ts`.
 */
export const PROGRAMME_GUIDED_UI_PRESET_EXERCISE =
  "Je fais l\u2019exercice propos\u00e9.";

export const PROGRAMME_GUIDED_UI_PRESET_CLASS_FOCUS =
  "Je pr\u00e9f\u00e8re qu\u2019on s\u2019appuie d\u2019abord sur ce qu\u2019on fait en ce moment en cours de fran\u00e7ais avant de continuer.";

/** Message UI uniquement : pas de tentative d’exercice, le parcours ne doit pas avancer sur ce tour. */
export function isProgrammeGuidedUiChoiceMessage(text: string): boolean {
  const t = text.trim();
  return t === PROGRAMME_GUIDED_UI_PRESET_EXERCISE || t === PROGRAMME_GUIDED_UI_PRESET_CLASS_FOCUS;
}
