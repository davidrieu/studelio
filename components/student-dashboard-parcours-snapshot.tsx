"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Radar as RadarIcon } from "lucide-react";
import type { CompetencyScores } from "@/lib/programme-guided-meta";
import { buildCompetencyRadarChartData } from "@/lib/programme-radar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ParcoursModuleSnapshotStats = {
  completed: number;
  inProgress: number;
  notStarted: number;
  total: number;
};

const SNAPSHOT_RADAR_H = 200;

function meanRadar(scores: CompetencyScores | null): number {
  if (!scores) return 0;
  const keys: (keyof CompetencyScores)[] = [
    "grammaire",
    "orthographe",
    "conjugaison",
    "vocabulaire",
    "expressionEcrite",
    "lecture",
  ];
  const sum = keys.reduce((a, k) => a + Math.min(100, Math.max(0, scores[k])), 0);
  return Math.round(sum / keys.length);
}

export function StudentDashboardParcoursSnapshot(props: {
  competencyScores: CompetencyScores | null;
  moduleStats: ParcoursModuleSnapshotStats | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const rawRadar = buildCompetencyRadarChartData(props.competencyScores);
  const labelShort: Record<string, string> = {
    Grammaire: "Gram.",
    Orthographe: "Orth.",
    Conjugaison: "Conj.",
    Vocabulaire: "Vocab.",
    "Expression écrite": "Expr.",
    Lecture: "Lect.",
  };
  const radarData = rawRadar.map((d) => ({
    ...d,
    subject: labelShort[d.subject] ?? d.subject,
  }));
  const radarAvg = meanRadar(props.competencyScores);
  const m = props.moduleStats;
  const total = m?.total ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-[var(--studelio-border)]",
        "bg-gradient-to-br from-[var(--studelio-blue-dim)]/45 via-card to-[var(--studelio-bg-soft)]/90",
        "p-4 shadow-[var(--studelio-shadow)] sm:p-6",
      )}
    >
      <div
        className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-[var(--studelio-blue)]/[0.1] blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md",
                "bg-gradient-to-br from-[#4f7ae8] to-[#2451b0] shadow-[#2451b0]/20",
              )}
            >
              <RadarIcon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2
                id="parcours-apercu-heading"
                className="font-display text-lg font-semibold tracking-tight text-[var(--studelio-text)] sm:text-xl"
              >
                Radar & modules du parcours
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Aperçu général de tes compétences (0–100) et de la répartition des modules. Le détail se trouve sur la
                page Parcours.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Moyenne radar (indicative) :{" "}
                <span className="font-semibold tabular-nums text-[var(--studelio-text)]">{radarAvg}%</span>
                {total > 0 ? (
                  <>
                    {" "}
                    · Modules :{" "}
                    <span className="font-semibold tabular-nums text-[var(--studelio-text)]">
                      {m!.completed}/{total}
                    </span>{" "}
                    terminés
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Modules (vue globale)</p>
            {total > 0 && m ? (
              <div
                className="mt-2 flex h-3 w-full max-w-md overflow-hidden rounded-full bg-muted/70 dark:bg-muted/40"
                role="img"
                aria-label={`Modules : ${m.completed} terminés, ${m.inProgress} en cours, ${m.notStarted} non commencés, sur ${total}`}
              >
                {m.completed > 0 ? (
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${pct(m.completed)}%` }}
                  />
                ) : null}
                {m.inProgress > 0 ? (
                  <div
                    className="h-full bg-[var(--studelio-blue)] transition-all duration-500"
                    style={{ width: `${pct(m.inProgress)}%` }}
                  />
                ) : null}
                {m.notStarted > 0 ? (
                  <div
                    className="h-full bg-muted-foreground/25 transition-all duration-500"
                    style={{ width: `${pct(m.notStarted)}%` }}
                  />
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Aucun module listé pour ton niveau pour l’instant.</p>
            )}
            {total > 0 && m ? (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                <li className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" aria-hidden />
                  Terminé ({m.completed})
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-[var(--studelio-blue)]" aria-hidden />
                  En cours ({m.inProgress})
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-muted-foreground/35" aria-hidden />
                  Pas commencé ({m.notStarted})
                </li>
              </ul>
            ) : null}
          </div>

          <Link
            href="/app/programme"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-5 inline-flex w-full justify-center rounded-full px-6 sm:w-auto sm:min-w-[220px]",
            )}
          >
            Ouvrir radar et modules
          </Link>
        </div>

        <div className="relative w-full shrink-0 rounded-2xl border border-[var(--studelio-border)]/70 bg-card/60 p-3 shadow-inner lg:w-[min(100%,280px)]">
          <p className="px-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Radar (aperçu)
          </p>
          <div className="mt-1" style={{ height: SNAPSHOT_RADAR_H }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="52%" outerRadius="78%" data={radarData}>
                  <PolarGrid stroke="var(--studelio-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--studelio-text-body)", fontSize: 9 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Compétences"
                    dataKey="value"
                    stroke="var(--studelio-blue)"
                    fill="var(--studelio-blue)"
                    fillOpacity={0.32}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Préparation du graphique…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
