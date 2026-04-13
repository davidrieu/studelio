import type { ChapterProgressStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { StudentProgramme } from "@/components/student-programme";
import { niveauLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function ProgrammePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  let profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      programme: {
        include: {
          chapters: { orderBy: { order: "asc" } },
          dictations: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, audioUrl: true, correctedText: true, order: true },
          },
        },
      },
    },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.programmeId) {
    const match = await prisma.programme.findUnique({
      where: { niveau: profile.niveau },
    });
    if (match) {
      await prisma.studentProfile.update({
        where: { id: profile.id },
        data: { programmeId: match.id },
      });
      profile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          programme: {
            include: {
              chapters: { orderBy: { order: "asc" } },
              dictations: {
                orderBy: { order: "asc" },
                select: { id: true, title: true, audioUrl: true, correctedText: true, order: true },
              },
            },
          },
        },
      });
    }
  }

  if (!profile) {
    redirect("/onboarding");
  }

  const prog = profile.programme;
  const chapters = prog?.chapters ?? [];

  if (!prog || chapters.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-8 shadow-[var(--studelio-shadow)]">
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">Programme personnalisé</h1>
        <p className="mt-2 max-w-xl text-[var(--studelio-text-body)]">
          Aucun programme n’est encore disponible pour le niveau{" "}
          <span className="font-medium">{niveauLabel[profile.niveau]}</span>. Les contenus sont chargés lors du déploiement
          (seed base de données). En local, lance{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run db:seed</code>.
        </p>
        <Link href="/app/dashboard" className={cn(buttonVariants(), "mt-6 inline-flex rounded-full")}>
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const progressRows = await prisma.studentChapterProgress.findMany({
    where: {
      studentProfileId: profile.id,
      chapterId: { in: chapters.map((c) => c.id) },
    },
  });

  const initialProgress: Partial<Record<string, ChapterProgressStatus>> = {};
  for (const row of progressRows) {
    initialProgress[row.chapterId] = row.status;
  }

  return (
    <StudentProgramme
      programmeTitle={prog.title}
      programmeDescription={prog.description}
      dictations={prog.dictations ?? []}
      chapters={chapters.map((c) => ({
        id: c.id,
        order: c.order,
        title: c.title,
        description: c.description,
        objectives: c.objectives,
        skills: c.skills,
      }))}
      initialProgress={initialProgress}
    />
  );
}
