import { Prisma } from "@prisma/client";

/**
 * Message lisible pour l’élève quand la persistance Parcours échoue (Vercel + Neon, etc.).
 */
export function parcoursPersistUserMessage(error: unknown): string {
  const generic =
    "Parcours : la mise à jour n’a pas pu s’enregistrer (erreur serveur). Réessaie dans un instant ou ouvre « Parcours » et clique « Recharger les scores ».";

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2021":
        return "Parcours : une table ou colonne manque sur la base (Neon). Il faut exécuter les migrations Prisma sur cette base : en local avec la même DATABASE_URL que Vercel, lance `npx prisma migrate deploy`, ou configure le build Vercel avec `npm run vercel-build`.";
      case "P2010":
      case "P2014":
        return "Parcours : la base refuse l’opération (contrainte ou requête). Vérifie que toutes les migrations Prisma sont appliquées sur Neon.";
      case "P2024":
        return "Parcours : la base a mis trop longtemps à répondre (Neon / cold start). Réessaie dans quelques secondes.";
      case "P1001":
      case "P1002":
      case "P1017":
        return "Parcours : impossible de joindre la base pour l’instant (Neon en pause, réseau ou limite de connexions). Réessaie ou réveille le projet dans le dashboard Neon.";
      case "P2002":
        return "Parcours : conflit d’enregistrement (rare). Rafraîchis la page et réessaie.";
      case "P2003":
        return "Parcours : donnée liée manquante (profil ou programme). Vérifie que ton compte élève et ton programme sont bien créés en base.";
      default:
        break;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Parcours : incohérence entre le client Prisma et la base (version ou schéma). Regénère le client (`npx prisma generate`) et redéploie.";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Parcours : impossible d’initialiser la connexion à la base. Vérifie `DATABASE_URL` sur Vercel (SSL, mot de passe, hôte Neon).";
  }

  if (error instanceof Error) {
    const m = error.message;
    if (/does not exist|relation .+ does not exist|Unknown table|42P01/i.test(m)) {
      return "Parcours : table ou relation introuvable sur Neon — exécute `npx prisma migrate deploy` avec la variable DATABASE_URL de production.";
    }
    if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|timeout|Connection terminated|Server has closed the connection/i.test(m)) {
      return "Parcours : connexion à Neon interrompue ou en timeout. Réessaie ; si ça persiste, augmente le pool ou vérifie que l’instance Neon n’est pas suspendue.";
    }
  }

  return generic;
}
