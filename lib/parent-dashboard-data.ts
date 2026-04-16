import type { StudentCompetencyProgress } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ParentChildRow = {
  profileId: string;
  userId: string;
  name: string | null;
  email: string;
  niveau: string;
  programmeTitle: string | null;
  streakDays: number;
  totalMinutes: number;
  lastSessionAt: Date | null;
  onboardingDone: boolean;
  chaptersCompleted: number;
  chaptersTotal: number;
  chatSessions: number;
  blancEnrollments: number;
  /** 0–100 : radar si dispo, sinon avancement modules, sinon 0. */
  progressPercent: number;
};

function meanRadarFromRow(row: {
  grammaire: number;
  orthographe: number;
  conjugaison: number;
  vocabulaire: number;
  expressionEcrite: number;
  lecture: number;
}): number {
  const vals = [
    row.grammaire,
    row.orthographe,
    row.conjugaison,
    row.vocabulaire,
    row.expressionEcrite,
    row.lecture,
  ];
  const sum = vals.reduce((a, v) => a + Math.min(100, Math.max(0, Number(v) || 0)), 0);
  return Math.min(100, Math.round((sum / 6) * 10) / 10);
}

function computeProgressPercent(radar: number | null, chaptersCompleted: number, chaptersTotal: number): number {
  if (radar !== null) return Math.min(100, Math.max(0, Math.round(radar)));
  if (chaptersTotal > 0) {
    return Math.min(100, Math.max(0, Math.round((chaptersCompleted / chaptersTotal) * 100)));
  }
  return 0;
}

export async function getParentChildrenRows(parentUserId: string): Promise<ParentChildRow[]> {
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: parentUserId },
    include: {
      children: {
        include: {
          user: { select: { id: true, email: true, name: true } },
          programme: { select: { id: true, title: true } },
          chapterProgress: { select: { status: true } },
        },
      },
    },
  });

  if (!parentProfile?.children.length) {
    return [];
  }

  const rows = await Promise.all(
    parentProfile.children.map(async (child) => {
      const programmeId = child.programmeId;
      let chaptersTotal = 0;
      if (programmeId) {
        chaptersTotal = await prisma.programmeChapter.count({ where: { programmeId } });
      }

      const completed = child.chapterProgress.filter((p) => p.status === "COMPLETED").length;

      let competency: StudentCompetencyProgress | null = null;
      try {
        competency = await prisma.studentCompetencyProgress.findUnique({
          where: { studentProfileId: child.id },
        });
      } catch {
        competency = null;
      }

      const [chatSessions, blancEnrollments] = await Promise.all([
        prisma.chatSession.count({ where: { userId: child.userId } }),
        prisma.blancEnrollment.count({ where: { userId: child.userId } }),
      ]);

      const radarMoyenne = competency ? meanRadarFromRow(competency) : null;
      const progressPercent = computeProgressPercent(radarMoyenne, completed, chaptersTotal);

      return {
        profileId: child.id,
        userId: child.userId,
        name: child.user.name,
        email: child.user.email,
        niveau: child.niveau,
        programmeTitle: child.programme?.title ?? null,
        streakDays: child.streakDays,
        totalMinutes: child.totalMinutes,
        lastSessionAt: child.lastSessionAt,
        onboardingDone: Boolean(child.onboardingCompletedAt),
        chaptersCompleted: completed,
        chaptersTotal,
        chatSessions,
        blancEnrollments,
        progressPercent,
      } satisfies ParentChildRow;
    }),
  );

  return rows;
}
