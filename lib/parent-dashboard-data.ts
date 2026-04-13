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
};

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

  const rows: ParentChildRow[] = [];

  for (const child of parentProfile.children) {
    const programmeId = child.programmeId;
    let chaptersTotal = 0;
    if (programmeId) {
      chaptersTotal = await prisma.programmeChapter.count({ where: { programmeId } });
    }

    const completed = child.chapterProgress.filter((p) => p.status === "COMPLETED").length;

    const [chatSessions, blancEnrollments] = await Promise.all([
      prisma.chatSession.count({ where: { userId: child.userId } }),
      prisma.blancEnrollment.count({ where: { userId: child.userId } }),
    ]);

    rows.push({
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
    });
  }

  return rows;
}
