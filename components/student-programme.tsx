"use client";

import type { ChapterProgressStatus } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { setChapterProgress } from "@/actions/programme";
import { buttonVariants } from "@/components/ui/button";
import { chapterProgressLabel } from "@/lib/labels";
import {
  buildSkillRadarData,
  countChapterStats,
  type ProgrammeChapterForRadar,
  type ProgressByChapter,
} from "@/lib/programme-radar";
import { cn } from "@/lib/utils";

const STATUS_ORDER: ChapterProgressStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

type Chapter = ProgrammeChapterForRadar & {
  order: number;
  description: string | null;
  objectives: string[];
};

type Props = {
  programmeTitle: string;
  programmeDescription: string | null;
  chapters: Chapter[];
  initialProgress: ProgressByChapter;
};

export function StudentProgramme({ programmeTitle, programmeDescription, chapters, initialProgress }: Props) {
  const [progress, setProgress] = useState<ProgressByChapter>(initialProgress);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const radarData = useMemo(
    () => buildSkillRadarData(chapters, progress, 6),
    [chapters, progress],
  );

  const stats = useMemo(
    () => countChapterStats(chapters.map((c) => c.id), progress),
    [chapters, progress],
  );

  const pctDone = chapters.length ? Math.round((stats.completed / chapters.length) * 100) : 0;

  function updateStatus(chapterId: string, status: ChapterProgressStatus) {
    setErr(null);
    startTransition(async () => {
      const r = await setChapterProgress(chapterId, status);
      if (r.ok) {
        setProgress((p) => ({ ...p, [chapterId]: status }));
      } else {
        setErr(r.message);
      }
    });
  }

  function statusFor(id: string): ChapterProgressStatus {
    return progress[id] ?? "NOT_STARTED";
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[20px] border-2 border-[var(--studelio-blue)]/25 bg-gradient-to-br from-[var(--studelio-blue-dim)] to-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h2 className="font-display text-xl font-semibold text-[var(--studelio-text)]">Séance programme (immersif)</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">
          André mène la séance : plan d’exercices selon ton niveau et tes difficultés, difficulté réajustée après chaque
          réponse. Tu ne choisis pas le thème — tu réponds aux consignes. Le chat « André » du menu reste libre pour tes
          questions.
        </p>
        <Link
          href="/app/programme/seance"
          className={cn(buttonVariants(), "mt-5 inline-flex rounded-full")}
        >
          Entrer dans la séance
        </Link>
      </section>

      <header className="rounded-[20px] border border-[var(--studelio-border)] bg-gradient-to-br from-[var(--studelio-bg-soft)] to-[var(--studelio-bg-muted)] p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">{programmeTitle}</h1>
        {programmeDescription ? (
          <p className="mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">{programmeDescription}</p>
        ) : null}
        <p className="mt-3 text-sm font-medium text-[var(--studelio-text)]">
          {stats.completed} / {chapters.length} chapitres terminés ({pctDone}%)
        </p>
      </header>

      {err ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
          <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Radar des compétences</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pour chaque axe, l’avancement reflète les chapitres liés (terminé = 100 %, en cours = 50 %).
          </p>
          <div className="mt-4 h-[min(22rem,55vw)] w-full min-h-[240px]">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                  <PolarGrid stroke="var(--studelio-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--studelio-text-body)", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Avancement"
                    dataKey="value"
                    stroke="var(--studelio-blue)"
                    fill="var(--studelio-blue)"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Pas assez de données pour le radar.</p>
            )}
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
          <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Chapitres</h2>
          <p className="mt-1 text-xs text-muted-foreground">Indique où tu en es : André s’appuiera sur ton niveau.</p>
          <ul className="mt-4 space-y-4">
            {chapters.map((ch) => (
              <li
                key={ch.id}
                className="rounded-2xl border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)]/40 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Chapitre {ch.order}
                    </p>
                    <h3 className="font-medium text-[var(--studelio-text)]">{ch.title}</h3>
                    {ch.description ? (
                      <p className="mt-1 text-sm text-[var(--studelio-text-body)]">{ch.description}</p>
                    ) : null}
                    {ch.objectives.length > 0 ? (
                      <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                        {ch.objectives.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 sm:items-end">
                    <span className="text-xs text-muted-foreground">Statut</span>
                    <div className="flex flex-wrap gap-1">
                      {STATUS_ORDER.map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={pending}
                          onClick={() => updateStatus(ch.id, st)}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                            statusFor(ch.id) === st
                              ? "bg-[var(--studelio-blue)] text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-[var(--studelio-blue-dim)] hover:text-[var(--studelio-text)]",
                          )}
                        >
                          {chapterProgressLabel[st]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
