"use client";

import type { ChapterProgressStatus } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { DictationRow } from "@/components/programme-dictations";
import { ProgrammeDictationsSection } from "@/components/programme-dictations";
import { buttonVariants } from "@/components/ui/button";
import { chapterProgressLabel } from "@/lib/labels";
import type { CompetencyScores } from "@/lib/programme-guided-meta";
import { moduleProgressPercent } from "@/lib/programme-module-progress";
import {
  buildCompetencyRadarChartData,
  countChapterStats,
  type ProgrammeChapterForRadar,
  type ProgressByChapter,
} from "@/lib/programme-radar";
import { cn } from "@/lib/utils";

export type ChapterProgressDetail = {
  status: ChapterProgressStatus;
  programmeMetaHits: number;
};

type Chapter = ProgrammeChapterForRadar & {
  order: number;
  description: string | null;
  objectives: string[];
};

type Props = {
  programmeTitle: string;
  programmeDescription: string | null;
  dictations?: DictationRow[];
  chapters: Chapter[];
  /** Progression par module (mise à jour côté serveur après chaque séance programme avec META). */
  initialChapterProgress: Record<string, ChapterProgressDetail>;
  /** Scores 0–100 par axe (mis à jour depuis les séances programme avec André). */
  competencyScores: CompetencyScores | null;
};

export function StudentProgramme({
  programmeTitle,
  programmeDescription,
  dictations = [],
  chapters,
  initialChapterProgress,
  competencyScores,
}: Props) {
  /** Recharts (ResponsiveContainer) peut planter au rendu SSR — on n’affiche le radar qu’après hydratation. */
  const [radarMounted, setRadarMounted] = useState(false);
  useEffect(() => {
    setRadarMounted(true);
  }, []);

  const progressStatusOnly: ProgressByChapter = useMemo(() => {
    const o: ProgressByChapter = {};
    for (const [id, d] of Object.entries(initialChapterProgress)) {
      o[id] = d.status;
    }
    return o;
  }, [initialChapterProgress]);

  const radarData = useMemo(() => buildCompetencyRadarChartData(competencyScores), [competencyScores]);

  const stats = useMemo(
    () => countChapterStats(chapters.map((c) => c.id), progressStatusOnly),
    [chapters, progressStatusOnly],
  );

  const pctDone = chapters.length ? Math.round((stats.completed / chapters.length) * 100) : 0;

  function detailFor(id: string): ChapterProgressDetail {
    return initialChapterProgress[id] ?? { status: "NOT_STARTED", programmeMetaHits: 0 };
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
          {chapters.length > 0 ?
            <>
              {stats.completed} / {chapters.length} modules terminés ({pctDone}%)
            </>
          : "Aucun module en base pour l’instant — les dictées ci-dessous restent disponibles."}
        </p>
      </header>

      <ProgrammeDictationsSection dictations={dictations} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
          <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Radar des compétences</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Chaque axe progresse à <strong>chaque échange</strong> en séance programme (petit bonus), et davantage quand
            André envoie le bloc <strong>META</strong> en fin de message. Même chose pour les barres des modules à
            droite : tu vois avancer sans rien cocher à la main.
          </p>
          <div className="mt-4 h-[min(22rem,55vw)] w-full min-h-[240px]">
            {radarMounted ?
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                  <PolarGrid stroke="var(--studelio-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--studelio-text-body)", fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Progression"
                    dataKey="value"
                    stroke="var(--studelio-blue)"
                    fill="var(--studelio-blue)"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            : <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground">
                Chargement du graphique…
              </div>
            }
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
          <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Modules</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Les libellés des 6 modules sont toujours ceux du programme Studelio (synchro auto). Progression en petits pas
            à chaque réponse d’André, plus fort quand le META liste les modules ; un premier passage sur cette page peut
            rattraper l’historique (anciennes séances).
          </p>
          <ul className="mt-4 space-y-5">
            {chapters.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-[var(--studelio-border)] bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                Les modules sont chargés via le seed / la base. Tu peux quand même utiliser les dictées et la séance
                programme avec André.
              </li>
            ) : null}
            {chapters.map((ch) => {
              const d = detailFor(ch.id);
              const pct = moduleProgressPercent(d.status, d.programmeMetaHits);
              return (
                <li
                  key={ch.id}
                  className="rounded-2xl border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)]/40 p-4"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Module {ch.order}
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
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                          d.status === "COMPLETED" ?
                            "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                          : d.status === "IN_PROGRESS" ?
                            "bg-[var(--studelio-blue)]/15 text-[var(--studelio-blue)]"
                          : "bg-muted text-muted-foreground",
                        )}
                      >
                        {chapterProgressLabel[d.status]}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Progression</span>
                        <span className="tabular-nums font-medium text-[var(--studelio-text)]">
                          {pct % 1 === 0 ? pct : pct.toFixed(1)}%
                        </span>
                      </div>
                      <div
                        className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80 dark:bg-muted/50"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progression du module ${ch.order}`}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500 ease-out",
                            d.status === "COMPLETED" ? "bg-emerald-500" : "bg-[var(--studelio-blue)]",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
