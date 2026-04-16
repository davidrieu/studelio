import type { ChapterProgressStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StudentDashboardView } from "@/components/student-dashboard-view";
import { findStudentChapterProgressRowsSafe } from "@/lib/load-student-chapter-progress-safe";
import { loadStudentCompetencyScoresSafe } from "@/lib/load-student-competency-scores";
import { prisma } from "@/lib/prisma";
import { epreuveBlancheShortLabel } from "@/lib/blanc-kind";
import { niveauLabel, planLabel, subStatusLabel } from "@/lib/labels";
import { countChapterStats } from "@/lib/programme-radar";
import { ensureStudentProgrammeLinkedToCanonical } from "@/lib/student-programme-canonical";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const checkoutOk = searchParams?.checkout === "success";
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: {
        include: {
          programme: true,
          parent: { include: { user: { select: { email: true } } } },
        },
      },
      subscription: true,
      _count: { select: { chatSessions: true, blancEnrollments: true } },
    },
  });

  if (!user?.studentProfile) {
    redirect("/onboarding");
  }

  const firstName = user.name?.split(/\s+/)[0] ?? "toi";
  const sp = user.studentProfile;
  const prog = sp.programme;
  const sub = user.subscription;

  await ensureStudentProgrammeLinkedToCanonical({
    studentProfileId: sp.id,
    niveau: sp.niveau,
    programmeIdOnProfile: sp.programmeId,
    programmeRelationId: prog?.id ?? null,
  });

  const programmeId =
    (await prisma.studentProfile.findUnique({
      where: { id: sp.id },
      select: { programmeId: true },
    }))?.programmeId ??
    (await prisma.programme.findUnique({ where: { niveau: sp.niveau }, select: { id: true } }))?.id ??
    null;

  const parcoursCompetencyScores = await loadStudentCompetencyScoresSafe(sp.id);

  let parcoursModuleStats: {
    completed: number;
    inProgress: number;
    notStarted: number;
    total: number;
  } | null = null;
  if (programmeId) {
    const chapterRows = await prisma.programmeChapter.findMany({
      where: { programmeId },
      select: { id: true },
    });
    const ids = chapterRows.map((c) => c.id);
    const progressRows = await findStudentChapterProgressRowsSafe(sp.id, ids);
    const byChapter: Record<string, ChapterProgressStatus | undefined> = {};
    for (const r of progressRows) byChapter[r.chapterId] = r.status;
    const stats = countChapterStats(ids, byChapter);
    parcoursModuleStats = { ...stats, total: ids.length };
  }

  return (
    <StudentDashboardView
      checkoutOk={Boolean(checkoutOk)}
      firstName={firstName}
      niveauLabel={niveauLabel[sp.niveau]}
      programmeTitle={prog?.title ?? null}
      lastSessionAt={sp.lastSessionAt}
      streakDays={sp.streakDays}
      totalMinutes={sp.totalMinutes}
      chatSessionsCount={user._count.chatSessions}
      blancEnrollmentsCount={user._count.blancEnrollments}
      epreuveShortLabel={epreuveBlancheShortLabel(sp.niveau)}
      planLabelText={sub ? planLabel[sub.plan] : null}
      subStatusText={sub ? subStatusLabel[sub.status] : null}
      subStatus={sub ? sub.status : null}
      parentEmail={sp.parent?.user?.email ?? null}
      parcoursCompetencyScores={parcoursCompetencyScores}
      parcoursModuleStats={parcoursModuleStats}
    />
  );
}
