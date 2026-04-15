"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { BookOpen, Contrast, Focus, Link2, Palette, Type, UnfoldVertical, Wind } from "lucide-react";
import { saveA11yPreferences } from "@/actions/a11y-preferences";
import { MaterialAccessibilityIcon } from "@/components/material-accessibility-icon";
import type { A11yCvdMode, A11yFontStep, A11yPreferences } from "@/lib/a11y-preferences";
import { defaultA11yPreferences } from "@/lib/a11y-preferences";
import { cn } from "@/lib/utils";

type Props = { initial: A11yPreferences };

const CVD_OPTIONS: { mode: A11yCvdMode; label: string; hint: string }[] = [
  { mode: "none", label: "Aucun", hint: "Couleurs d’origine" },
  { mode: "protanopia", label: "Rouge–vert (P)", hint: "Protanopie / protanomalie" },
  { mode: "deuteranopia", label: "Rouge–vert (D)", hint: "Deutéranopie / deutéranomalie" },
  { mode: "tritanopia", label: "Bleu–jaune", hint: "Tritanopie" },
  { mode: "monochrome", label: "Nuances de gris", hint: "Sans couleur saturée" },
];

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

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
  const setCvdMode = (cvdMode: A11yCvdMode) => persist({ ...prefs, cvdMode });
  const toggleHighContrast = () => persist({ ...prefs, highContrast: !prefs.highContrast });
  const toggleReduceMotion = () => persist({ ...prefs, reduceMotion: !prefs.reduceMotion });
  const toggleUnderlineLinks = () => persist({ ...prefs, underlineLinks: !prefs.underlineLinks });
  const toggleReadableFont = () => persist({ ...prefs, readableFont: !prefs.readableFont });
  const toggleComfortSpacing = () => persist({ ...prefs, comfortSpacing: !prefs.comfortSpacing });
  const toggleFocusStrong = () => persist({ ...prefs, focusStrong: !prefs.focusStrong });
  const reset = () => persist({ ...defaultA11yPreferences });

  return (
    <>
      <p ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      <div className="pointer-events-none fixed bottom-4 left-4 z-[120] flex flex-col items-start gap-2">
        {open ? (
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
            className="pointer-events-auto max-h-[min(85vh,calc(100vh-5rem))] w-[min(100vw-2rem,22.5rem)] overflow-y-auto rounded-2xl border border-[var(--studelio-border)] bg-card p-4 text-sm shadow-xl"
          >
            <h2 id={`${panelId}-title`} className="font-display text-base font-semibold text-[var(--studelio-text)]">
              Accessibilité
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Réglages pour le confort visuel et la perception des couleurs. Sauvegarde locale (cookie) sur cet appareil.
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

            <fieldset className="mt-5 space-y-2 border-0 border-t border-[var(--studelio-border)] p-0 pt-4">
              <legend className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--studelio-text)]">
                <Palette className="h-4 w-4 text-[var(--studelio-blue)]" aria-hidden />
                Vision des couleurs (daltonisme)
              </legend>
              <p className="text-[0.7rem] leading-snug text-muted-foreground">
                Filtres indicatifs pour mieux distinguer certaines teintes ; ne remplacent pas un diagnostic.
              </p>
              <div className="flex flex-col gap-1.5">
                {CVD_OPTIONS.map(({ mode, label, hint }) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={pending}
                    title={hint}
                    onClick={() => setCvdMode(mode)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors",
                      prefs.cvdMode === mode
                        ? "border-[var(--studelio-blue)] bg-[var(--studelio-blue-dim)] text-[var(--studelio-text)]"
                        : "border-input bg-background hover:bg-muted",
                    )}
                  >
                    <span className="block">{label}</span>
                    <span className="mt-0.5 block text-[0.65rem] font-normal text-muted-foreground">{hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 space-y-2 border-t border-[var(--studelio-border)] pt-4">
              <p className="mb-2 text-xs font-medium text-[var(--studelio-text)]">Lisibilité</p>
              <button
                type="button"
                disabled={pending}
                onClick={toggleReadableFont}
                aria-pressed={prefs.readableFont}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                  prefs.readableFont
                    ? "border-[var(--studelio-blue)] bg-[var(--studelio-blue-dim)]"
                    : "border-input hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 shrink-0 text-[var(--studelio-blue)]" aria-hidden />
                  Police lisible
                </span>
                <span className="shrink-0 text-muted-foreground">{prefs.readableFont ? "Activé" : "Désactivé"}</span>
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={toggleComfortSpacing}
                aria-pressed={prefs.comfortSpacing}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                  prefs.comfortSpacing
                    ? "border-[var(--studelio-blue)] bg-[var(--studelio-blue-dim)]"
                    : "border-input hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2">
                  <UnfoldVertical className="h-4 w-4 shrink-0 text-[var(--studelio-blue)]" aria-hidden />
                  Espacement du texte
                </span>
                <span className="shrink-0 text-muted-foreground">{prefs.comfortSpacing ? "Activé" : "Désactivé"}</span>
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={toggleUnderlineLinks}
                aria-pressed={prefs.underlineLinks}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                  prefs.underlineLinks
                    ? "border-[var(--studelio-blue)] bg-[var(--studelio-blue-dim)]"
                    : "border-input hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 shrink-0 text-[var(--studelio-blue)]" aria-hidden />
                  Souligner les liens
                </span>
                <span className="shrink-0 text-muted-foreground">{prefs.underlineLinks ? "Activé" : "Désactivé"}</span>
              </button>
            </div>

            <div className="mt-4 space-y-2 border-t border-[var(--studelio-border)] pt-4">
              <p className="mb-2 text-xs font-medium text-[var(--studelio-text)]">Contraste et mouvement</p>
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

              <button
                type="button"
                disabled={pending}
                onClick={toggleFocusStrong}
                aria-pressed={prefs.focusStrong}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                  prefs.focusStrong
                    ? "border-[var(--studelio-blue)] bg-[var(--studelio-blue-dim)]"
                    : "border-input hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2">
                  <Focus className="h-4 w-4 text-[var(--studelio-blue)]" aria-hidden />
                  Focus clavier très visible
                </span>
                <span className="text-muted-foreground">{prefs.focusStrong ? "Activé" : "Désactivé"}</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--studelio-border)] pt-4">
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
                Tout réinitialiser
              </button>
            </div>
            <p className="mt-3 text-[0.65rem] text-muted-foreground">Échap ferme ce panneau.</p>
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
          <MaterialAccessibilityIcon className="h-6 w-6 shrink-0" />
          <span className="sr-only">Ouvrir ou fermer les options d’accessibilité</span>
        </button>
      </div>
    </>
  );
}
