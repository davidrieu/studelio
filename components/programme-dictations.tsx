"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type DictationRow = {
  id: string;
  title: string;
  audioUrl: string;
  correctedText: string;
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
  const [showCorrect, setShowCorrect] = useState(false);

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
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setShowCorrect((s) => !s)}
          >
            {showCorrect ? "Masquer le corrigé" : "Voir le corrigé"}
          </Button>
          {showCorrect ? (
            <div className="mt-3 rounded-xl border border-[var(--studelio-border)] bg-card p-4 text-sm leading-relaxed text-[var(--studelio-text-body)] whitespace-pre-wrap">
              {row.correctedText}
            </div>
          ) : null}
        </div>
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
        Écoute ou regarde le média (vitesse réglable), écris ta dictée, puis compare avec le corrigé quand tu es prêt·e. Les
        fichiers MP3 et MP4 (piste audio) sont pris en charge. André peut aussi te proposer ces dictées en séance programme.
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
