"use client";

import type { ChapterProgressStatus, Niveau } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { chapterProgressLabel, niveauLabel } from "@/lib/labels";
import type { CompetencyScores } from "@/lib/programme-guided-meta";
import { moduleProgressPercent } from "@/lib/programme-module-progress";
import {
  buildCompetencyRadarChartData,
  countChapterStats,
  type ProgrammeChapterForRadar,
  type ProgressByChapter,
} from "@/lib/programme-radar";
import type { ProgrammeViewPayload } from "@/lib/student-programme-view-data";
import { STUDELIO_PROGRAMME_PROGRESS_EVENT } from "@/lib/studelio-programme-progress-events";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";

export type ChapterProgressDetail = {
  status: ChapterProgressStatus;
  programmeMetaHits: number;
};

type Chapter = ProgrammeChapterForRadar & {
  order: number;
  description: string | null;
  objectives: string[];
};

const EMPTY_CHAPTER_PROGRESS: Record<string, ChapterProgressDetail> = {};

const RADAR_AXES: { key: keyof CompetencyScores; label: string }[] = [
  { key: "grammaire", label: "Grammaire" },
  { key: "orthographe", label: "Orthographe" },
  { key: "conjugaison", label: "Conjugaison" },
  { key: "vocabulaire", label: "Vocabulaire" },
  { key: "expressionEcrite", label: "Expr. écrite" },
  { key: "lecture", label: "Lecture" },
];

function formatSyncTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Parcours : données radar + modules rechargées depuis l’API à chaque ouverture,
 * après chaque message André (événement global), et sur bouton « Recharger ».
 */
export function StudentProgramme() {
  const [payload, setPayload] = useState<ProgrammeViewPayload | null>(null);
  const [emptyNiveau, setEmptyNiveau] = useState<Niveau | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [radarMounted, setRadarMounted] = useState(false);
  useEffect(() => {
    setRadarMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setEmptyNiveau(null);
    try {
      const res = await fetch("/api/student/programme-view", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json()) as
        | ProgrammeViewPayload
        | { ok: false; code: string; message?: string; niveau?: Niveau };

      if (!res.ok) {
        if (res.status === 401) {
          setLoadError("Session expirée — reconnecte-toi.");
          setPayload(null);
          return;
        }
        setLoadError((j as { message?: string }).message ?? "Erreur de chargement.");
        setPayload(null);
        return;
      }

      if ("ok" in j && j.ok === false) {
        if (j.code === "no_content") {
          setPayload(null);
          setEmptyNiveau(j.niveau ?? null);
          return;
        }
        setLoadError(j.message ?? "Données indisponibles.");
        setPayload(null);
        return;
      }

      if ("ok" in j && j.ok === true) {
        setPayload(j);
      }
    } catch {
      setLoadError("Réseau indisponible.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onProgress = () => {
      void load();
    };
    window.addEventListener(STUDELIO_PROGRAMME_PROGRESS_EVENT, onProgress);
    return () => window.removeEventListener(STUDELIO_PROGRAMME_PROGRESS_EVENT, onProgress);
  }, [load]);

  const initialChapterProgress = useMemo(
    () => payload?.chapterProgress ?? EMPTY_CHAPTER_PROGRESS,
    [payload?.chapterProgress],
  );
  const competencyScores = payload?.competencyScores ?? null;
  const chapters: Chapter[] = useMemo(
    () =>
      (payload?.chapters ?? []).map((c) => ({
        id: c.id,
        order: c.order,
        title: c.title,
        description: c.description,
        objectives: c.objectives,
        skills: c.skills,
      })),
    [payload?.chapters],
  );
  const dictations: DictationRow[] = payload?.dictations ?? [];
  const programmeTitle = payload?.programmeTitle ?? "Programme";
  const programmeDescription = payload?.programmeDescription ?? null;
  const updatedAt = payload?.updatedAt;

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

  const scoreMap = competencyScores ?? {
    grammaire: 0,
    orthographe: 0,
    conjugaison: 0,
    vocabulaire: 0,
    expressionEcrite: 0,
    lecture: 0,
  };

  if (emptyNiveau && !loading) {
    return (
      <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-8 shadow-[var(--studelio-shadow)]">
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">Programme personnalisé</h1>
        <p className="mt-2 max-w-xl text-[var(--studelio-text-body)]">
          Aucun contenu pour le niveau{" "}
          <span className="font-medium">{niveauLabel[emptyNiveau]}</span> : il faut au moins des modules (seed) ou des
          dictées en admin pour ce programme.
        </p>
        <Link href="/app/dashboard" className={cn(buttonVariants(), "mt-6 inline-flex rounded-full")}>
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[20px] border-2 border-[var(--studelio-blue)]/30 bg-gradient-to-br from-[var(--studelio-blue-dim)]/50 to-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[var(--studelio-text)]">Séance programme</h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--studelio-text-body)]">
              Chaque message à André en séance met à jour ton parcours. Reviens ici : les chiffres se rechargent tout
              seuls après chaque réponse (ou utilise « Recharger »).
            </p>
          </div>
          <Link href="/app/programme/seance" className={cn(buttonVariants(), "inline-flex shrink-0 rounded-full")}>
            Ouvrir la séance
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[var(--studelio-border)] bg-gradient-to-b from-card to-[var(--studelio-bg-soft)]/30 p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <div className="flex flex-col gap-4 border-b border-[var(--studelio-border)]/60 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--studelio-blue)]">
              Progression en direct
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--studelio-text)]">
              {programmeTitle}
            </h1>
            {programmeDescription ?
              <p className="mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">{programmeDescription}</p>
            : null}
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {updatedAt ?
                <>
                  <span>Dernière synchro.</span>
                  <time className="font-mono text-[var(--studelio-text)]" dateTime={updatedAt}>
                    {formatSyncTime(updatedAt)}
                  </time>
                </>
              : null}
              {loading ?
                <span className="inline-flex items-center gap-1 text-[var(--studelio-blue)]">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Mise à jour…
                </span>
              : null}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 gap-2 rounded-full"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
            Recharger les scores
          </Button>
        </div>

        {loadError ?
          <p className="mt-4 text-sm text-destructive" role="alert">
            {loadError}
          </p>
        : null}

        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground">Points radar (0–100)</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {RADAR_AXES.map(({ key, label }) => (
              <div
                key={key}
                className="rounded-2xl border border-[var(--studelio-border)] bg-card/80 px-3 py-3 text-center shadow-sm"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--studelio-blue)]">
                  {Math.round(scoreMap[key])}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-sm font-medium text-[var(--studelio-text)]">
          {chapters.length > 0 ?
            <>
              {stats.completed} / {chapters.length} modules terminés ({pctDone}%)
            </>
          : "Modules : en attente de contenu en base."}
        </p>
      </section>

      <ProgrammeDictationsSection dictations={dictations} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
          <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Vue radar</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Même donnée que les cartes ci-dessus. Elle se met à jour à chaque rechargement depuis le serveur.
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
            Statut et barre lus en base après chaque réponse d’André (META ou petit bonus automatique).
          </p>
          <ul className="mt-4 space-y-5">
            {chapters.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-[var(--studelio-border)] bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                Pas encore de modules pour ce programme.
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
                        {ch.description ?
                          <p className="mt-1 text-sm text-[var(--studelio-text-body)]">{ch.description}</p>
                        : null}
                        {ch.objectives.length > 0 ?
                          <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                            {ch.objectives.map((o) => (
                              <li key={o}>{o}</li>
                            ))}
                          </ul>
                        : null}
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
