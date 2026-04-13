import type { ChapterProgressStatus, Niveau, Plan, SubStatus, Tag } from "@prisma/client";

export const niveauLabel: Record<Niveau, string> = {
  SIXIEME: "6e",
  CINQUIEME: "5e",
  QUATRIEME: "4e",
  TROISIEME: "3e",
  SECONDE: "2nde",
  PREMIERE: "1re",
  TERMINALE: "Terminale",
  BTS: "BTS",
};

export const tagLabel: Record<Tag, string> = {
  DYSLEXIE: "Dyslexie",
  DYSORTHOGRAPHIE: "Dysorthographie",
  DYSCALCULIE: "Dyscalculie",
  TDAH: "TDAH",
  HPI: "HPI / surdouance",
  TROUBLE_ANXIEUX: "Trouble anxieux",
};

export const planLabel: Record<Plan, string> = {
  ESSENTIEL: "Essentiel",
  STANDARD: "Standard",
  INTENSIF: "Intensif",
};

export const chapterProgressLabel: Record<ChapterProgressStatus, string> = {
  NOT_STARTED: "Pas commencé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
};

export const subStatusLabel: Record<SubStatus, string> = {
  ACTIVE: "Actif",
  TRIALING: "Essai",
  PAST_DUE: "Paiement en retard",
  CANCELED: "Résilié",
  INCOMPLETE: "À finaliser",
};

/** Centres d’intérêt proposés (stockés comme libellés dans interests[]) */
export const suggestedInterests = [
  "Lecture",
  "Cinéma & séries",
  "Sport",
  "Musique",
  "Sciences",
  "Histoire",
  "Jeux vidéo",
  "Art & création",
  "Actualités",
  "Nature & environnement",
] as const;
