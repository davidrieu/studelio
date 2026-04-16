import type {
  BacBlancStatus,
  ChapterProgressStatus,
  Niveau,
  OrderKind,
  OrderStatus,
  Plan,
  Role,
  SubStatus,
  Tag,
} from "@prisma/client";

export const roleLabel: Record<Role, string> = {
  STUDENT: "Élève",
  PARENT: "Parent",
  CORRECTOR: "Correcteur",
  ADMIN: "Administrateur",
};

export const niveauLabel: Record<Niveau, string> = {
  SIXIEME: "6e",
  CINQUIEME: "5e",
  QUATRIEME: "4e",
  TROISIEME: "3e",
  SECONDE: "2nde",
  PREMIERE_GENERALE: "1re générale",
  PREMIERE_TECHNOLOGIQUE: "1re technologique",
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
  STANDARD: "Progression",
  INTENSIF: "Excellence",
};

export const chapterProgressLabel: Record<ChapterProgressStatus, string> = {
  NOT_STARTED: "Pas commencé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
};

export const bacBlancStatusLabel: Record<BacBlancStatus, string> = {
  PENDING: "À venir",
  SUBMITTED: "Copie envoyée",
  IN_REVIEW: "En correction",
  CORRECTED: "Corrigé",
};

export const subStatusLabel: Record<SubStatus, string> = {
  ACTIVE: "Actif",
  TRIALING: "Essai",
  PAST_DUE: "Paiement en retard",
  CANCELED: "Résilié",
  INCOMPLETE: "À finaliser",
};

export const orderKindLabel: Record<OrderKind, string> = {
  SUBSCRIPTION: "Abonnement",
  BLANC_ADDON: "Examen blanc (à l’unité)",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: "En attente de paiement",
  COMPLETED: "Payée",
  CANCELED: "Annulée / expirée",
  REFUNDED: "Remboursée",
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

/** Ordre d’affichage des niveaux (formulaires paramètres / onboarding). */
export const niveauxOrdered = [
  "SIXIEME",
  "CINQUIEME",
  "QUATRIEME",
  "TROISIEME",
  "SECONDE",
  "PREMIERE_GENERALE",
  "PREMIERE_TECHNOLOGIQUE",
  "TERMINALE",
  "BTS",
] as const satisfies readonly Niveau[];
