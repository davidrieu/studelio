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

/** Contenus de référence (programmes officiels) — seed Prisma uniquement. */
export const programmeSeeds: ProgrammeSeed[] = [
  {
    niveau: "SIXIEME",
    title: "Français — 6e",
    description:
      "Programme conforme aux attendus du cycle 4 (entrée) : fondations de la langue, lecture, expression.",
    chapters: [
      {
        order: 1,
        title: "Grammaire : la phrase",
        description: "Types et formes de phrases, classes de mots, fonctions.",
        objectives: ["Identifier la structure d’une phrase", "Reconnaître les classes de mots"],
        skills: ["Analyse grammaticale", "Syntaxe"],
        systemPrompt:
          "Priorise les questions sur la phrase minimale, le sujet et le verbe, puis les compléments.",
      },
      {
        order: 2,
        title: "Orthographe",
        description: "Accord sujet-verbe, adjectif, homophones grammaticaux.",
        objectives: ["Appliquer les accords de base", "Distinguer homophones courants"],
        skills: ["Orthographe grammaticale", "Lexique"],
      },
      {
        order: 3,
        title: "Conjugaison",
        description: "Présent, imparfait, futur, passé composé (1er groupe).",
        objectives: ["Conjuguer les temps du quotidien", "Repérer l’auxiliaire"],
        skills: ["Conjugaison", "Temps verbaux"],
      },
      {
        order: 4,
        title: "Lecture",
        description: "Textes narratifs : récit d’aventures, mythologie.",
        objectives: ["Lire à voix haute avec fluidité", "Repérer les personnages et le fil narratif"],
        skills: ["Compréhension", "Vocabulaire contextuel"],
      },
      {
        order: 5,
        title: "Expression écrite",
        description: "Raconter, décrire (50–80 mots).",
        objectives: ["Structurer un court texte", "Varier la syntaxe"],
        skills: ["Production écrite", "Cohérence"],
      },
      {
        order: 6,
        title: "Vocabulaire",
        description: "Familles de mots, préfixes et suffixes.",
        objectives: ["Déduire le sens d’un mot inconnu", "Constituer des champs lexicaux"],
        skills: ["Lexique", "Dérivation"],
      },
    ],
  },
  {
    niveau: "CINQUIEME",
    title: "Français — 5e",
    description: "Approfondissement grammatical et entrée dans la complexité de la phrase.",
    chapters: [
      {
        order: 1,
        title: "Grammaire : subordination",
        description: "Propositions subordonnées relatives et conjonctives, compléments circonstanciels.",
        objectives: ["Repérer une subordonnée", "Lier des propositions"],
        skills: ["Syntaxe", "Subordination"],
      },
      {
        order: 2,
        title: "Orthographe",
        description: "Accord du participe passé (avoir / être), tout / tous.",
        objectives: ["Accorder le participe passé", "Maîtriser tout / tous"],
        skills: ["Orthographe", "Accords"],
      },
      {
        order: 3,
        title: "Conjugaison",
        description: "Conditionnel, subjonctif présent, plus-que-parfait.",
        objectives: ["Employer le conditionnel de politesse", "Introduire le subjonctif"],
        skills: ["Modes et temps", "Conjugaison"],
      },
      {
        order: 4,
        title: "Lecture",
        description: "Récit médiéval, texte autobiographique.",
        objectives: ["Situer un texte dans son époque", "Analyser un point de vue"],
        skills: ["Lecture analytique", "Culture littéraire"],
      },
      {
        order: 5,
        title: "Expression écrite",
        description: "Décrire un personnage, narration à la 1re personne (100–120 mots).",
        objectives: ["Faire vivre un personnage", "Gérer les temps du récit"],
        skills: ["Narration", "Style"],
      },
    ],
  },
  {
    niveau: "QUATRIEME",
    title: "Français — 4e",
    description: "Renforcement des outils pour l’analyse et l’argumentation simple.",
    chapters: [
      {
        order: 1,
        title: "Grammaire",
        description: "Discours indirect, valeurs des temps, ponctuation.",
        objectives: ["Transformer direct / indirect", "Justifier le temps employé"],
        skills: ["Syntaxe", "Temps verbaux"],
      },
      {
        order: 2,
        title: "Orthographe",
        description: "Verbes en -eler / -eter, -yer, accord des adjectifs de couleur.",
        objectives: ["Appliquer les règles d’orthographe lexicale ciblées"],
        skills: ["Orthographe", "Accords"],
      },
      {
        order: 3,
        title: "Conjugaison",
        description: "Passé simple, tous les modes.",
        objectives: ["Reconnaître et conjuguer le passé simple", "Relier mode et intention"],
        skills: ["Conjugaison", "Lecture du patrimoine"],
      },
      {
        order: 4,
        title: "Lecture",
        description: "Roman réaliste (XIXe), poésie romantique.",
        objectives: ["Repérer un mouvement littéraire", "Analyser une image poétique"],
        skills: ["Analyse littéraire", "Figures de style"],
      },
      {
        order: 5,
        title: "Expression écrite",
        description: "Portrait, argumentation simple (150 mots).",
        objectives: ["Structurer une courte argumentation", "Nuancer"],
        skills: ["Argumentation", "Organisation du texte"],
      },
    ],
  },
  {
    niveau: "TROISIEME",
    title: "Français — 3e",
    description: "Préparation au brevet : consolidation et méthodes.",
    chapters: [
      {
        order: 1,
        title: "Grammaire — révisions",
        description: "Révision complète, analyse logique.",
        objectives: ["Réinvestir toutes les fonctions", "Justifier une analyse"],
        skills: ["Analyse de la phrase", "Grammaire"],
      },
      {
        order: 2,
        title: "Orthographe — révisions",
        description: "Révision brevet.",
        objectives: ["Automatiser les accords fréquents", "Réduire les erreurs lexicales"],
        skills: ["Orthographe"],
      },
      {
        order: 3,
        title: "Conjugaison — révisions",
        description: "Tous les temps.",
        objectives: ["Maîtriser les paradigmes courants"],
        skills: ["Conjugaison"],
      },
      {
        order: 4,
        title: "Lecture",
        description: "Roman engagé, théâtre classique.",
        objectives: ["Relire un texte au second degré", "Repérer les enjeux"],
        skills: ["Compréhension", "Interprétation"],
      },
      {
        order: 5,
        title: "Expression écrite",
        description: "Texte argumentatif (200–250 mots), commentaire simple.",
        objectives: ["Problématique courte", "Progression d’idées"],
        skills: ["Argumentation", "Méthode"],
      },
      {
        order: 6,
        title: "Préparation Brevet",
        description: "Contraction, rédaction, questions de compréhension.",
        objectives: ["S’entraîner sur les formats d’épreuve"],
        skills: ["Méthode", "Synthèse"],
      },
    ],
  },
  {
    niveau: "SECONDE",
    title: "Français — 2nde",
    description: "Socle pour le lycée : langue, styles, premières analyses exigeantes.",
    chapters: [
      {
        order: 1,
        title: "Grammaire",
        description: "Fonctions dans la proposition, subordination.",
        objectives: ["Cartographier une phrase complexe"],
        skills: ["Syntaxe", "Analyse"],
      },
      {
        order: 2,
        title: "Stylistique",
        description: "Figures de style (métaphore, comparaison, hyperbole, antithèse…).",
        objectives: ["Nommer et justifier une figure", "Effets sur le lecteur"],
        skills: ["Style", "Poésie"],
      },
      {
        order: 3,
        title: "Lecture",
        description: "Texte humaniste (XVIe), tragédie classique, poésie baroque.",
        objectives: ["Contextualiser", "Relier forme et sens"],
        skills: ["Culture", "Analyse"],
      },
      {
        order: 4,
        title: "Expression écrite",
        description: "Paragraphe argumenté, début de commentaire composé.",
        objectives: ["Construire un paragraphe problème + exemple + conclusion locale"],
        skills: ["Méthode", "Argumentation"],
      },
    ],
  },
  {
    niveau: "PREMIERE",
    title: "Français — 1re",
    description: "Objets d’étude et méthodes du bac de français.",
    chapters: [
      {
        order: 1,
        title: "Objets d’étude",
        description: "Roman / récit, poésie, théâtre, littérature d’idées.",
        objectives: ["Mobiliser les notions propres à chaque objet"],
        skills: ["Analyse littéraire", "Notions"],
      },
      {
        order: 2,
        title: "Commentaire composé",
        description: "Méthode complète : introduction, axes, conclusion.",
        objectives: ["Plan cohérent", "Progression analytique"],
        skills: ["Méthode", "Dissertation courte"],
      },
      {
        order: 3,
        title: "Dissertation",
        description: "Problématique, plan dialectique / thématique.",
        objectives: ["Formuler une problématique pertinente", "Articuler les parties"],
        skills: ["Argumentation", "Plan"],
      },
      {
        order: 4,
        title: "Contraction de texte",
        description: "Méthode officiale (bac).",
        objectives: ["Respecter contraintes de longueur et de fidélité"],
        skills: ["Synthèse", "Reformulation"],
      },
      {
        order: 5,
        title: "Essai critique",
        description: "Préparation BTS le cas échéant.",
        objectives: ["Comparer et évaluer des points de vue"],
        skills: ["Critique", "Registre"],
      },
    ],
  },
  {
    niveau: "TERMINALE",
    title: "Français — Terminale",
    description: "Perfectionnement méthodologique et entraînement intensif bac.",
    chapters: [
      {
        order: 1,
        title: "Révisions Première + approfondissement",
        description: "Consolidation des objets d’étude.",
        objectives: ["Mobiliser les œuvres au programme"],
        skills: ["Culture", "Analyse"],
      },
      {
        order: 2,
        title: "Contraction + Essai",
        description: "Entraînement intensif format bac.",
        objectives: ["Gagner en rapidité et précision"],
        skills: ["Méthode bac", "Temps limité"],
      },
      {
        order: 3,
        title: "Commentaire de texte",
        description: "Maîtrise en temps limité.",
        objectives: ["Annoncer un plan clair sous pression"],
        skills: ["Commentaire", "Méthode"],
      },
      {
        order: 4,
        title: "Dissertation",
        description: "Fluidité, exemples, transitions.",
        objectives: ["Améliorer la tenue du fil argumentatif"],
        skills: ["Dissertation", "Cohérence"],
      },
      {
        order: 5,
        title: "Oral du bac",
        description: "Présentation d’un extrait, entretien.",
        objectives: ["Structurer l’oral", "Argumenter à l’oral"],
        skills: ["Oral", "Présentation"],
      },
      {
        order: 6,
        title: "Parcours associés aux œuvres",
        description: "Liens avec les thématiques du programme.",
        objectives: ["Relier œuvres et questions contemporaines"],
        skills: ["Culture", "Problématisation"],
      },
    ],
  },
  {
    niveau: "BTS",
    title: "Français — BTS",
    description: "Formats professionnels : synthèse, essai, oral.",
    chapters: [
      {
        order: 1,
        title: "Contraction de texte BTS",
        description: "Spécificités du format (1/4 du texte, objectivité).",
        objectives: ["Respecter le format et le registre"],
        skills: ["Synthèse", "Objectivité"],
      },
      {
        order: 2,
        title: "Synthèse de documents",
        description: "Reformulation, connexion entre sources.",
        objectives: ["Comparer des documents", "Produire une synthèse neutre"],
        skills: ["Synthèse", "Information"],
      },
      {
        order: 3,
        title: "Essai BTS",
        description: "Argumentation structurée, registre professionnel.",
        objectives: ["Adapter le ton au contexte pro"],
        skills: ["Argumentation", "Registre"],
      },
      {
        order: 4,
        title: "Expression orale",
        description: "Exposé, discussion, argumentation.",
        objectives: ["Clarté, prise de parole", "Réponses aux questions"],
        skills: ["Oral", "Interaction"],
      },
    ],
  },
];
