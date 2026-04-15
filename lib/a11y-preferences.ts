export const A11Y_PREFERENCES_COOKIE = "studelio-a11y";

/** Conteneur du contenu de l’app : les filtres CVD s’appliquent ici pour ne pas casser le `position: fixed` de la barre d’accessibilité. */
export const A11Y_VISUAL_ROOT_ID = "studelio-a11y-visual-root";

export type A11yFontStep = 0 | 1 | 2 | 3;

/** Simulation / aide à la distinction des couleurs (rouge–vert, bleu–jaune, ou nuances retirées). */
export type A11yCvdMode = "none" | "protanopia" | "deuteranopia" | "tritanopia" | "monochrome";

export type A11yPreferences = {
  /** 0 = taille par défaut du navigateur, 1–3 = agrandissement progressif */
  fontStep: A11yFontStep;
  highContrast: boolean;
  /** Force des transitions quasi nulles (en plus du respect de prefers-reduced-motion) */
  reduceMotion: boolean;
  /** Daltonisme : filtres sur le corps de la page (voir components/a11y-color-vision-filters.tsx) */
  cvdMode: A11yCvdMode;
  /** Souligner tous les liens pour les repérer sans la couleur seule */
  underlineLinks: boolean;
  /** Police sans empattement large et interlettrage léger */
  readableFont: boolean;
  /** Interlignes et aération un peu plus confortables */
  comfortSpacing: boolean;
  /** Anneau de focus très visible (clavier / lecteur d’écran) */
  focusStrong: boolean;
};

export const defaultA11yPreferences: A11yPreferences = {
  fontStep: 0,
  highContrast: false,
  reduceMotion: false,
  cvdMode: "none",
  underlineLinks: false,
  readableFont: false,
  comfortSpacing: false,
  focusStrong: false,
};

function clampFontStep(n: number): A11yFontStep {
  if (!Number.isFinite(n)) return 0;
  const r = Math.min(3, Math.max(0, Math.round(n)));
  return r as A11yFontStep;
}

function parseCvdMode(raw: string | null): A11yCvdMode {
  switch (raw) {
    case "p":
      return "protanopia";
    case "d":
      return "deuteranopia";
    case "t":
      return "tritanopia";
    case "m":
      return "monochrome";
    default:
      return "none";
  }
}

function cvdModeCookieValue(mode: A11yCvdMode): string | undefined {
  switch (mode) {
    case "protanopia":
      return "p";
    case "deuteranopia":
      return "d";
    case "tritanopia":
      return "t";
    case "monochrome":
      return "m";
    default:
      return undefined;
  }
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
      cvdMode: parseCvdMode(p.get("cv")),
      underlineLinks: p.get("ul") === "1",
      readableFont: p.get("rf") === "1",
      comfortSpacing: p.get("cs") === "1",
      focusStrong: p.get("ff") === "1",
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
  const cv = cvdModeCookieValue(prefs.cvdMode);
  if (cv) p.set("cv", cv);
  if (prefs.underlineLinks) p.set("ul", "1");
  if (prefs.readableFont) p.set("rf", "1");
  if (prefs.comfortSpacing) p.set("cs", "1");
  if (prefs.focusStrong) p.set("ff", "1");
  return p.toString();
}

/** Attributs `data-*` sur `<html>` pour le CSS d’accessibilité. */
export function a11yHtmlDataAttributes(prefs: A11yPreferences): Record<string, string | undefined> {
  return {
    "data-a11y-font": prefs.fontStep > 0 ? String(prefs.fontStep) : undefined,
    "data-a11y-high-contrast": prefs.highContrast ? "true" : undefined,
    "data-a11y-reduce-motion": prefs.reduceMotion ? "true" : undefined,
    "data-a11y-cvd": prefs.cvdMode !== "none" ? prefs.cvdMode : undefined,
    "data-a11y-underline-links": prefs.underlineLinks ? "true" : undefined,
    "data-a11y-readable-font": prefs.readableFont ? "true" : undefined,
    "data-a11y-comfort-spacing": prefs.comfortSpacing ? "true" : undefined,
    "data-a11y-focus-strong": prefs.focusStrong ? "true" : undefined,
  };
}

/** Props exploitables sur `<html>` (valeurs définies uniquement). */
export function a11yHtmlDataProps(prefs: A11yPreferences): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(a11yHtmlDataAttributes(prefs))) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
