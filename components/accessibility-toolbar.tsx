"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { Accessibility, Contrast, Type, Wind } from "lucide-react";
import { saveA11yPreferences } from "@/actions/a11y-preferences";
import type { A11yFontStep, A11yPreferences } from "@/lib/a11y-preferences";
import { cn } from "@/lib/utils";

type Props = { initial: A11yPreferences };

export function AccessibilityToolbar({ initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPreferences>(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPrefs(initial);
  }, [initial]);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  const announce = useCallback((msg: string) => {
    if (liveRef.current) liveRef.current.textContent = msg;
  }, []);

  const persist = useCallback(
    (next: A11yPreferences) => {
      setPrefs(next);
      startTransition(async () => {
        await saveA11yPreferences(next);
        router.refresh();
        announce("Préférences d’accessibilité enregistrées.");
      });
    },
    [announce, router],
  );

  const setFontStep = (fontStep: A11yFontStep) => persist({ ...prefs, fontStep });
  const toggleHighContrast = () => persist({ ...prefs, highContrast: !prefs.highContrast });
  const toggleReduceMotion = () => persist({ ...prefs, reduceMotion: !prefs.reduceMotion });
  const reset = () => persist({ fontStep: 0, highContrast: false, reduceMotion: false });

  return (
    <>
      <p ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      <div className="pointer-events-none fixed bottom-4 left-4 z-[120] flex flex-col items-start gap-2">
        {open ? (
          <div
            id={panelId}
            role="dialog"
            aria-labelledby={`${panelId}-title`}
            className="pointer-events-auto w-[min(100vw-2rem,20rem)] rounded-2xl border border-[var(--studelio-border)] bg-card p-4 text-sm shadow-xl"
          >
            <h2 id={`${panelId}-title`} className="font-display text-base font-semibold text-[var(--studelio-text)]">
              Accessibilité
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ces réglages s’appliquent à tout le site sur cet appareil (sauvegarde dans un cookie).
            </p>

            <fieldset className="mt-4 space-y-3 border-0 p-0">
              <legend className="sr-only">Taille du texte</legend>
              <div className="flex items-center gap-2 text-[var(--studelio-text)]">
                <Type className="h-4 w-4 shrink-0 text-[var(--studelio-blue)]" aria-hidden />
                <span className="text-xs font-medium">Taille du texte</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { step: 0 as const, label: "Défaut" },
                    { step: 1 as const, label: "Grand" },
                    { step: 2 as const, label: "Très grand" },
                    { step: 3 as const, label: "Maximum" },
                  ] as const
                ).map(({ step, label }) => (
                  <button
                    key={step}
                    type="button"
                    disabled={pending}
                    onClick={() => setFontStep(step)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      prefs.fontStep === step
                        ? "border-[var(--studelio-blue)] bg-[var(--studelio-blue-dim)] text-[var(--studelio-text)]"
                        : "border-input bg-background hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 space-y-2 border-t border-[var(--studelio-border)] pt-4">
              <button
                type="button"
                disabled={pending}
                onClick={toggleHighContrast}
                aria-pressed={prefs.highContrast}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                  prefs.highContrast
                    ? "border-[var(--studelio-blue)] bg-[var(--studelio-blue-dim)]"
                    : "border-input hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2">
                  <Contrast className="h-4 w-4 text-[var(--studelio-blue)]" aria-hidden />
                  Contraste renforcé
                </span>
                <span className="text-muted-foreground">{prefs.highContrast ? "Activé" : "Désactivé"}</span>
              </button>

              <button
                type="button"
                disabled={pending}
                onClick={toggleReduceMotion}
                aria-pressed={prefs.reduceMotion}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                  prefs.reduceMotion
                    ? "border-[var(--studelio-blue)] bg-[var(--studelio-blue-dim)]"
                    : "border-input hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-[var(--studelio-blue)]" aria-hidden />
                  Réduire les animations
                </span>
                <span className="text-muted-foreground">{prefs.reduceMotion ? "Activé" : "Désactivé"}</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-full border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={reset}
                className="rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        ) : null}

        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-haspopup="dialog"
          disabled={pending}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--studelio-border)] shadow-lg transition-transform",
            "bg-[var(--studelio-blue)] text-white hover:scale-105",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--studelio-bg)]",
            pending && "opacity-70",
          )}
          title="Options d’accessibilité"
        >
          <Accessibility className="h-6 w-6" strokeWidth={2} aria-hidden />
          <span className="sr-only">Ouvrir ou fermer les options d’accessibilité</span>
        </button>
      </div>
    </>
  );
}
