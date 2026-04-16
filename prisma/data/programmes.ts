import type { Niveau } from "@prisma/client";

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

/**
 * Modules Studelio (radar + barres de progression), alignés sur les libellés META `skills` / `chapters` (ordre 1–6).
 */
export const STUDELIO_STANDARD_MODULES: ChapterSeed[] = [
  {
    order: 1,
    title: "Module 1 - Grammaire",
    description: "Maîtriser la structure de la phrase, la nature et les fonctions des mots.",
    objectives: [],
    skills: ["Grammaire"],
  },
  {
    order: 2,
    title: "Module 2 - Orthographe",
    description: "Bien écrire : l’orthographe courante, les règles d’accord et les homophones.",
    objectives: [],
    skills: ["Orthographe"],
  },
  {
    order: 3,
    title: "Module 3 - Conjugaison",
    description: "Maîtriser les temps et les modes des verbes.",
    objectives: [],
    skills: ["Conjugaison"],
  },
  {
    order: 4,
    title: "Module 4 - Lecture",
    description: "Bien lire : Comprendre un texte et repérer l’essentiel.",
    objectives: [],
    skills: ["Lecture"],
  },
  {
    order: 5,
    title: "Module 5 - Expression écrite",
    description: "Bien argumenter et rédiger un texte cohérent.",
    objectives: [],
    skills: ["Expression écrite"],
  },
  {
    order: 6,
    title: "Module 6 - Vocabulaire",
    description: "Enrichir son vocabulaire pour comprendre et s’exprimer.",
    objectives: [],
    skills: ["Vocabulaire"],
  },
];

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
    niveau: "PREMIERE",
    title: "Français — 1re",
    description: "Objets d’étude et méthodes du bac de français.",
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
