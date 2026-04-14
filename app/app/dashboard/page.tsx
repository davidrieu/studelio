import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StudentDashboardView } from "@/components/student-dashboard-view";
import { prisma } from "@/lib/prisma";
import { epreuveBlancheShortLabel } from "@/lib/blanc-kind";
import { niveauLabel, planLabel, subStatusLabel } from "@/lib/labels";

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
    />
  );
}
