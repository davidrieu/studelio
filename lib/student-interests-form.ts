import { suggestedInterests } from "@/lib/labels";

const allowedSuggested = new Set(suggestedInterests as unknown as string[]);

/** Filtre les cases cochées pour ne garder que les libellés proposés à l’onboarding / paramètres. */
export function normalizeSuggestedInterestPicks(raw: string[]): string[] {
  return raw.filter((s) => allowedSuggested.has(s));
}

/** Fusionne cases cochées + champ « autres » (même règles que l’onboarding). */
export function mergeInterestsFromFormFields(picked: string[], interestsExtra: string | undefined): string[] {
  const fromExtra = (interestsExtra ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = Array.from(new Set([...picked, ...fromExtra]));
  return merged.map((s) => s.slice(0, 80)).slice(0, 24);
}
