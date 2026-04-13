"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Métadonnées dictée côté élève (pas de corrigé). */
export type DictationRow = {
  id: string;
  title: string;
  audioUrl: string;
  order: number;
};

/** MP4 / WebM / MOV → lecteur vidéo ; MP3 / M4A → lecteur audio. */
function dictationUrlLooksLikeVideo(url: string): boolean {
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  return [".mp4", ".m4v", ".webm", ".mov"].some((ext) => path.endsWith(ext));
}

function DictationPlayer({ row }: { row: DictationRow }) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [rate, setRate] = useState(1);

  const isVideo = useMemo(() => dictationUrlLooksLikeVideo(row.audioUrl), [row.audioUrl]);

  useEffect(() => {
    const el = mediaRef.current;
    if (el) {
      el.playbackRate = rate;
    }
  }, [rate]);

  const onRateChange = useCallback((v: number) => {
    setRate(v);
  }, []);

  return (
    <article
      className="rounded-2xl border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)]/40 p-4"
      id={`dictation-${row.id}`}
    >
      <h3 className="font-medium text-[var(--studelio-text)]">{row.title}</h3>
      <div className="mt-3 space-y-3">
        {isVideo ? (
          <video
            ref={(el) => {
              mediaRef.current = el;
            }}
            className="w-full max-w-md rounded-lg bg-black/5"
            controls
            src={row.audioUrl}
            preload="metadata"
          />
        ) : (
          <audio
            ref={(el) => {
              mediaRef.current = el;
            }}
            className="w-full max-w-md"
            controls
            src={row.audioUrl}
            preload="metadata"
          />
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <span className="whitespace-nowrap">Vitesse</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              className="w-36 accent-[var(--studelio-blue)]"
            />
            <span className="w-10 font-mono text-[var(--studelio-text)]">{rate.toFixed(1)}×</span>
          </label>
        </div>
        <p className="text-sm text-[var(--studelio-text-body)]">
          Le corrigé reste côté André : ouvre la dictée dans l’onglet dédié pour lui envoyer ton texte.
        </p>
        <Link
          href={`/app/dictee?d=${encodeURIComponent(row.id)}`}
          className={cn(buttonVariants(), "inline-flex w-fit rounded-full")}
        >
          Faire avec André
        </Link>
      </div>
    </article>
  );
}

type Props = {
  dictations: DictationRow[];
};

export function ProgrammeDictationsSection({ dictations }: Props) {
  if (dictations.length === 0) {
    return null;
  }

  const sorted = [...dictations].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  return (
    <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
      <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Dictées</h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">
        Écoute le média (vitesse réglable), puis va dans l’onglet <strong className="font-medium">Dictée</strong> ou clique
        « Faire avec André » : tu colleras ton texte dans le chat — André a le corrigé en interne et t’aide sans te le
        donner mot pour mot. MP3 et MP4 (piste audio) sont pris en charge.
      </p>
      <ul className="mt-6 space-y-6">
        {sorted.map((d) => (
          <li key={d.id}>
            <DictationPlayer row={d} />
          </li>
        ))}
      </ul>
    </section>
  );
}
