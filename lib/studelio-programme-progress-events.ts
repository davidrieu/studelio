/** Émis après chaque réponse André en séance programme (persist progression). */
export const STUDELIO_PROGRAMME_PROGRESS_EVENT = "studelio:programme-progress";

export function emitProgrammeProgressUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STUDELIO_PROGRAMME_PROGRESS_EVENT));
}
