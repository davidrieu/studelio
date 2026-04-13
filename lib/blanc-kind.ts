import type { BlancKind, Niveau } from "@prisma/client";

/** Niveaux collège : épreuves « brevet blanc ». */
export const niveauxBrevetBlanc: readonly Niveau[] = [
  "SIXIEME",
  "CINQUIEME",
  "QUATRIEME",
  "TROISIEME",
] as const;

/** Niveaux lycée / BTS : épreuves « bac blanc ». */
export const niveauxBacBlanc: readonly Niveau[] = ["SECONDE", "PREMIERE", "TERMINALE", "BTS"] as const;

export function blancKindForNiveau(niveau: Niveau): BlancKind {
  return niveauxBrevetBlanc.includes(niveau) ? "BREVET_BLANC" : "BAC_BLANC";
}

/** Libellé court pour l’élève (menu, titre de page). */
export function epreuveBlancheShortLabel(niveau: Niveau): string {
  return blancKindForNiveau(niveau) === "BREVET_BLANC" ? "Brevet blanc" : "Bac blanc";
}

/** Libellé pour l’admin (filtre / type de créneau). */
export const blancKindLabel: Record<BlancKind, string> = {
  BREVET_BLANC: "Brevet blanc (6e → 3e)",
  BAC_BLANC: "Bac blanc (2nde → BTS)",
};
