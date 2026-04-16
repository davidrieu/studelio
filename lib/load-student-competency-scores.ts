import type { CompetencyScores } from "@/lib/programme-guided-meta";
import { prisma } from "@/lib/prisma";

/**
 * Charge les scores radar ; renvoie null si aucune ligne ou si la table n’existe pas encore (migration non appliquée).
 */
export async function loadStudentCompetencyScoresSafe(studentProfileId: string): Promise<CompetencyScores | null> {
  try {
    const competencyRow = await prisma.studentCompetencyProgress.findUnique({
      where: { studentProfileId },
    });
    if (!competencyRow) return null;
    return {
      grammaire: competencyRow.grammaire,
      orthographe: competencyRow.orthographe,
      conjugaison: competencyRow.conjugaison,
      vocabulaire: competencyRow.vocabulaire,
      expressionEcrite: competencyRow.expressionEcrite,
      lecture: competencyRow.lecture,
    };
  } catch (e) {
    console.error(
      "[studelio] StudentCompetencyProgress — exécuter la migration prisma (20260413180000_student_competency_progress) si la table manque.",
      e,
    );
    return null;
  }
}
