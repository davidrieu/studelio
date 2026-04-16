import type { ChapterProgressStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { StudentProgramme } from "@/components/student-programme";
import { niveauLabel } from "@/lib/labels";
import { loadStudentCompetencyScoresSafe } from "@/lib/load-student-competency-scores";
import { bootstrapGuidedProgressHistoryOnce } from "@/lib/bootstrap-guided-progress-history";
import { ensureProgrammeStandardModules } from "@/lib/ensure-programme-standard-modules";
import { findStudentChapterProgressRowsSafe } from "@/lib/load-student-chapter-progress-safe";
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
            select: { id: true, title: true, audioUrl: true, order: true },
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
                select: { id: true, title: true, audioUrl: true, order: true },
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
  const dictations = prog?.dictations ?? [];

  let chapters = prog?.chapters ?? [];
  if (prog?.id) {
    await ensureProgrammeStandardModules(prog.id);
    chapters = await prisma.programmeChapter.findMany({
      where: { programmeId: prog.id },
      orderBy: { order: "asc" },
    });
    try {
      await bootstrapGuidedProgressHistoryOnce({
        studentProfileId: profile.id,
        userId: profile.userId,
        programmeId: prog.id,
      });
    } catch (e) {
      console.error("[programme] bootstrap guided progress history", e);
    }
  }

  // Avant : on bloquait toute la page si zéro chapitre → les dictées admin n’apparaissaient jamais.
  const hasChapters = chapters.length > 0;
  const hasDictations = dictations.length > 0;

  if (!prog || (!hasChapters && !hasDictations)) {
    return (
      <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-8 shadow-[var(--studelio-shadow)]">
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">Programme personnalisé</h1>
        <p className="mt-2 max-w-xl text-[var(--studelio-text-body)]">
          Aucun contenu pour le niveau <span className="font-medium">{niveauLabel[profile.niveau]}</span> : il faut au
          moins des modules (seed) ou des dictées ajoutées en admin pour le même programme que ton niveau.
        </p>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Vérifie en admin que la dictée est bien sous le programme qui correspond à ton niveau scolaire (ex. 3e →
          programme Troisième).
        </p>
        <Link href="/app/dashboard" className={cn(buttonVariants(), "mt-6 inline-flex rounded-full")}>
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const progressRows = hasChapters
    ? await findStudentChapterProgressRowsSafe(profile.id, chapters.map((c) => c.id))
    : [];

  const initialChapterProgress: Record<
    string,
    { status: ChapterProgressStatus; programmeMetaHits: number }
  > = {};
  for (const row of progressRows) {
    initialChapterProgress[row.chapterId] = {
      status: row.status,
      programmeMetaHits: row.programmeMetaHits,
    };
  }

  const competencyScores = await loadStudentCompetencyScoresSafe(profile.id);

  return (
    <StudentProgramme
      programmeTitle={prog.title}
      programmeDescription={prog.description}
      dictations={dictations}
      chapters={chapters.map((c) => ({
        id: c.id,
        order: c.order,
        title: c.title,
        description: c.description,
        objectives: c.objectives,
        skills: c.skills,
      }))}
      initialChapterProgress={initialChapterProgress}
      competencyScores={competencyScores}
    />
  );
}
