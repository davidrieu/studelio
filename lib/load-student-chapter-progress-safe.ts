import type { StudentChapterProgress } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MIGRATION_HINT =
  "[studelio] StudentChapterProgress : exécuter la migration Prisma `20260414100000_student_chapter_programme_meta_hits` (colonne `programmeMetaHits`). Commande : `npx prisma migrate deploy`";

/**
 * Charge la progression modules/chapitres ; renvoie [] si la table ou la colonne `programmeMetaHits` n’est pas à jour
 * (évite de casser la page programme / l’API chat avant migration).
 */
export async function findStudentChapterProgressRowsSafe(
  studentProfileId: string,
  chapterIds: string[],
): Promise<StudentChapterProgress[]> {
  if (chapterIds.length === 0) return [];
  try {
    return await prisma.studentChapterProgress.findMany({
      where: {
        studentProfileId,
        chapterId: { in: chapterIds },
      },
    });
  } catch (e) {
    console.error(MIGRATION_HINT, e);
    return [];
  }
}
