import type { StudentCompetencyProgress } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { previewWithoutMetaTail } from "@/lib/programme-guided-meta";

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
  /** Moyenne des six axes radar (0–100), null si pas encore de ligne en base. */
  radarMoyenne: number | null;
  /** Extrait du dernier message d’André en séance programme (sans bloc META). */
  lastProgrammeSeancePreview: string | null;
  lastProgrammeSeanceAt: Date | null;
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
  return Math.round((sum / 6) * 10) / 10;
}

function truncatePreview(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
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

      const [chatSessions, blancEnrollments, lastGuidedMsg] = await Promise.all([
        prisma.chatSession.count({ where: { userId: child.userId } }),
        prisma.blancEnrollment.count({ where: { userId: child.userId } }),
        prisma.chatMessage.findFirst({
          where: {
            role: "ANDRE",
            session: { userId: child.userId, kind: "PROGRAMME_GUIDED" },
          },
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true },
        }),
      ]);

      let radarMoyenne: number | null = null;
      if (competency) {
        radarMoyenne = meanRadarFromRow(competency);
      }

      let lastProgrammeSeancePreview: string | null = null;
      let lastProgrammeSeanceAt: Date | null = null;
      if (lastGuidedMsg?.content?.trim()) {
        lastProgrammeSeancePreview = truncatePreview(previewWithoutMetaTail(lastGuidedMsg.content));
        lastProgrammeSeanceAt = lastGuidedMsg.createdAt;
      }

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
        radarMoyenne,
        lastProgrammeSeancePreview,
        lastProgrammeSeanceAt,
      } satisfies ParentChildRow;
    }),
  );

  return rows;
}
