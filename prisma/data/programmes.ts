import type { Niveau } from "@prisma/client";
import { STUDELIO_STANDARD_MODULES_DEF } from "@/lib/studelio-standard-modules";

export type ChapterSeed = {
  order: number;
  title: string;
  description?: string;
  objectives: string[];
  skills: string[];
  systemPrompt?: string;
};

export type ProgrammeSeed = {
  niveau: Niveau;
  title: string;
  description: string;
  chapters: ChapterSeed[];
};

/** Même contenu que `lib/studelio-standard-modules.ts` — utilisé au seed. */
export const STUDELIO_STANDARD_MODULES: ChapterSeed[] = STUDELIO_STANDARD_MODULES_DEF.map((m) => ({
  order: m.order,
  title: m.title,
  description: m.description,
  objectives: [...m.objectives],
  skills: [...m.skills],
}));

/** Contenus de référence (programmes officiels) — seed Prisma uniquement. */
export const programmeSeeds: ProgrammeSeed[] = [
  {
    niveau: "SIXIEME",
    title: "Français — 6e",
    description:
      "Programme conforme aux attendus du cycle 4 (entrée) : fondations de la langue, lecture, expression.",
    chapters: STUDELIO_STANDARD_MODULES,
  },
  {
    niveau: "CINQUIEME",
    title: "Français — 5e",
    description: "Approfondissement grammatical et entrée dans la complexité de la phrase.",
    chapters: STUDELIO_STANDARD_MODULES,
  },
  {
    niveau: "QUATRIEME",
    title: "Français — 4e",
    description: "Renforcement des outils pour l’analyse et l’argumentation simple.",
    chapters: STUDELIO_STANDARD_MODULES,
  },
  {
    niveau: "TROISIEME",
    title: "Français — 3e",
    description: "Préparation au brevet : consolidation et méthodes.",
    chapters: STUDELIO_STANDARD_MODULES,
  },
  {
    niveau: "SECONDE",
    title: "Français — 2nde",
    description: "Socle pour le lycée : langue, styles, premières analyses exigeantes.",
    chapters: STUDELIO_STANDARD_MODULES,
  },
  {
    niveau: "PREMIERE_GENERALE",
    title: "Français — 1re générale",
    description: "Objets d’étude et méthodes du bac de français (voie générale).",
    chapters: STUDELIO_STANDARD_MODULES,
  },
  {
    niveau: "PREMIERE_TECHNOLOGIQUE",
    title: "Français — 1re technologique",
    description: "Français en série technologique : consolidation, méthodes et préparation aux épreuves.",
    chapters: STUDELIO_STANDARD_MODULES,
  },
  {
    niveau: "TERMINALE",
    title: "Français — Terminale",
    description: "Perfectionnement méthodologique et entraînement intensif bac.",
    chapters: STUDELIO_STANDARD_MODULES,
  },
  {
    niveau: "BTS",
    title: "Français — BTS",
    description: "Formats professionnels : synthèse, essai, oral.",
    chapters: STUDELIO_STANDARD_MODULES,
  },
];
