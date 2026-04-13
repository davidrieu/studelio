import { prisma } from "@/lib/prisma";
import { computeNextStreak } from "@/lib/student-activity";

/** Minutes créditées après un échange André terminé (POST /api/chat). */
export const MINUTES_PER_CHAT_ROUND = 3;
/** Minutes créditées lors d’un changement de progression chapitre. */
export const MINUTES_PER_CHAPTER_ACTIVITY = 5;

/**
 * Met à jour lastSessionAt, streakDays et totalMinutes pour l’élève.
 * Ne lance pas : les erreurs sont loguées (ne pas casser chat / programme).
 */
export async function recordStudentActivity(userId: string, minutesToAdd: number): Promise<void> {
  if (minutesToAdd <= 0) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.studentProfile.findUnique({
        where: { userId },
        select: { id: true, streakDays: true, lastSessionAt: true },
      });
      if (!profile) {
        return;
      }

      const now = new Date();
      const nextStreak = computeNextStreak(profile.lastSessionAt, profile.streakDays, now);

      await tx.studentProfile.update({
        where: { id: profile.id },
        data: {
          lastSessionAt: now,
          streakDays: nextStreak,
          totalMinutes: { increment: minutesToAdd },
        },
      });
    });
  } catch (e) {
    console.error("[recordStudentActivity]", e);
  }
}
