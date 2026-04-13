"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type DictationRow = {
  id: string;
  title: string;
  audioUrl: string;
  correctedText: string;
  order: number;
};

function DictationPlayer({ row }: { row: DictationRow }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [rate, setRate] = useState(1);
  const [showCorrect, setShowCorrect] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
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
        <audio ref={audioRef} className="w-full max-w-md" controls src={row.audioUrl} preload="metadata" />
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
        Écoute l’audio (vitesse réglable), écris sur ta feuille ou dans ta tête, puis compare avec le corrigé quand tu es
        prêt·e. André peut aussi te proposer ces dictées en séance programme.
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
