export const A11Y_PREFERENCES_COOKIE = "studelio-a11y";

export type A11yFontStep = 0 | 1 | 2 | 3;

export type A11yPreferences = {
  /** 0 = taille par défaut du navigateur, 1–3 = agrandissement progressif */
  fontStep: A11yFontStep;
  highContrast: boolean;
  /** Force des transitions quasi nulles (en plus du respect de prefers-reduced-motion) */
  reduceMotion: boolean;
};

export const defaultA11yPreferences: A11yPreferences = {
  fontStep: 0,
  highContrast: false,
  reduceMotion: false,
};

function clampFontStep(n: number): A11yFontStep {
  if (!Number.isFinite(n)) return 0;
  const r = Math.min(3, Math.max(0, Math.round(n)));
  return r as A11yFontStep;
}

export function parseA11yCookie(raw: string | undefined): A11yPreferences {
  if (!raw?.trim()) return { ...defaultA11yPreferences };
  try {
    const p = new URLSearchParams(raw);
    const fs = Number.parseInt(p.get("fs") ?? "0", 10);
    return {
      fontStep: Number.isFinite(fs) ? clampFontStep(fs) : 0,
      highContrast: p.get("hc") === "1",
      reduceMotion: p.get("rm") === "1",
    };
  } catch {
    return { ...defaultA11yPreferences };
  }
}

export function serializeA11yCookie(prefs: A11yPreferences): string {
  const p = new URLSearchParams();
  if (prefs.fontStep > 0) p.set("fs", String(prefs.fontStep));
  if (prefs.highContrast) p.set("hc", "1");
  if (prefs.reduceMotion) p.set("rm", "1");
  return p.toString();
}

/** Attributs `data-*` sur `<html>` pour le CSS d’accessibilité. */
export function a11yHtmlDataAttributes(prefs: A11yPreferences): Record<string, string | undefined> {
  return {
    "data-a11y-font": prefs.fontStep > 0 ? String(prefs.fontStep) : undefined,
    "data-a11y-high-contrast": prefs.highContrast ? "true" : undefined,
    "data-a11y-reduce-motion": prefs.reduceMotion ? "true" : undefined,
  };
}
