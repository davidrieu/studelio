/**
 * Modules affichés partout (page programme, prompts André, seed).
 * Source unique — ne pas dupliquer ailleurs.
 */
export type StudelioStandardModuleDef = {
  order: number;
  title: string;
  description: string;
  objectives: string[];
  skills: string[];
};

export const STUDELIO_STANDARD_MODULES_DEF: StudelioStandardModuleDef[] = [
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
