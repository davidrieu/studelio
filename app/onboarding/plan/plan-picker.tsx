"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Plan, SubStatus } from "@prisma/client";
import { planLabel } from "@/lib/labels";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS: Plan[] = ["ESSENTIEL", "STANDARD", "INTENSIF"];

const PRICE_LABEL: Record<Plan, string> = {
  ESSENTIEL: "9,99\u00a0€",
  STANDARD: "15,99\u00a0€",
  INTENSIF: "25,99\u00a0€",
};

const PITCH: Record<Plan, string> = {
  ESSENTIEL: "Les fondamentaux Studelio : André, programme, suivi — sans accès famille.",
  STANDARD: "Le bon équilibre : tout Essentiel + la visibilité parent / tuteur pour rester alignés.",
  INTENSIF:
    "Objectif examen : blancs notés comme au vrai test + correction par un enseignant, et accès anticipé aux nouveautés Studelio.",
};

/** Lignes du comparatif (ordre fixe pour lecture verticale). */
const COMPARISON_ROWS: { label: string; plans: Record<Plan, boolean> }[] = [
  {
    label: "André — prof particulier IA",
    plans: { ESSENTIEL: true, STANDARD: true, INTENSIF: true },
  },
  {
    label: "Parcours adapté au niveau de l’élève",
    plans: { ESSENTIEL: true, STANDARD: true, INTENSIF: true },
  },
  {
    label: "Programmes proches des programmes scolaires (Éducation nationale)",
    plans: { ESSENTIEL: true, STANDARD: true, INTENSIF: true },
  },
  {
    label: "Correction détaillée",
    plans: { ESSENTIEL: true, STANDARD: true, INTENSIF: true },
  },
  {
    label: "Suivi des progrès",
    plans: { ESSENTIEL: true, STANDARD: true, INTENSIF: true },
  },
  {
    label: "Aide aux devoirs avec André (chat)",
    plans: { ESSENTIEL: true, STANDARD: true, INTENSIF: true },
  },
  {
    label: "Accès parents / tuteur",
    plans: { ESSENTIEL: false, STANDARD: true, INTENSIF: true },
  },
  {
    label: "Simulation examen blanc (brevet, bac)",
    plans: { ESSENTIEL: false, STANDARD: false, INTENSIF: true },
  },
  {
    label: "Correction d’un examen blanc par un enseignant",
    plans: { ESSENTIEL: false, STANDARD: false, INTENSIF: true },
  },
  {
    label: "Accès anticipé aux nouvelles fonctionnalités",
    plans: { ESSENTIEL: false, STANDARD: false, INTENSIF: true },
  },
];

function Cell({ included }: { included: boolean }) {
  return (
    <div className="flex justify-center py-2">
      {included ? (
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--studelio-green-dim)] text-[var(--studelio-text)]">
          <Check className="size-4" strokeWidth={2.5} aria-hidden />
          <span className="sr-only">Inclus</span>
        </span>
      ) : (
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <X className="size-4" strokeWidth={2} aria-hidden />
          <span className="sr-only">Non inclus</span>
        </span>
      )}
    </div>
  );
}

export function PlanPicker({
  stripeConfigured,
  subscriptionStatus,
  canceledCheckout,
}: {
  stripeConfigured: boolean;
  subscriptionStatus: SubStatus;
  canceledCheckout: boolean;
}) {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alreadyPaid = subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIALING";

  async function choose(plan: Plan) {
    setError(null);
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Impossible de lancer le paiement.");
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setError("Réponse Stripe inattendue.");
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-10">
      {canceledCheckout ? (
        <p className="rounded-xl border border-[var(--studelio-border)] bg-card px-4 py-3 text-sm text-[var(--studelio-text-body)]">
          Paiement annulé. Tu peux comparer à nouveau les offres ou réessayer quand tu veux.
        </p>
      ) : null}
      {alreadyPaid ? (
        <p className="rounded-xl border border-[var(--studelio-green-dim)] bg-[var(--studelio-green-dim)] px-4 py-3 text-sm text-[var(--studelio-text)]">
          Ton abonnement est déjà actif ou en essai. Tu peux aller sur ton tableau de bord.
        </p>
      ) : null}
      {!stripeConfigured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Les clés Stripe ne sont pas configurées sur ce serveur. En local ou sans Price IDs, tu peux quand même
          parcourir les offres ci-dessous, puis aller au tableau de bord pour continuer le développement.
        </p>
      ) : null}

      <div className="rounded-[20px] border border-[var(--studelio-blue)]/25 bg-gradient-to-br from-[var(--studelio-blue-dim)]/80 via-card to-card px-4 py-4 text-center shadow-[var(--studelio-shadow)] sm:px-6 sm:py-5">
        <p className="font-display text-lg font-semibold text-[var(--studelio-text)] sm:text-xl">
          3 jours gratuits sur chaque offre
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">
          Teste André, le programme et le suivi sans rien payer pendant 3 jours. Choisis ensuite la formule qui te
          convient — ou résilie avant la fin de l’essai.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
        {PLANS.map((plan) => {
          const recommended = plan === "STANDARD";
          return (
            <div
              key={plan}
              className={cn(
                "relative flex flex-col rounded-[20px] border bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-7",
                recommended
                  ? "border-[var(--studelio-blue)] ring-2 ring-[var(--studelio-blue)]/20 lg:scale-[1.02] lg:shadow-lg"
                  : "border-[var(--studelio-border)]",
              )}
            >
              {recommended ? (
                <span className="absolute -top-3 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--studelio-blue)] px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                  Le plus complet pour la famille
                </span>
              ) : null}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Essai 3 jours
                </span>
              </div>
              <h2 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">{planLabel[plan]}</h2>
              <p className="mt-3 flex flex-wrap items-baseline gap-1">
                <span className="font-display text-4xl font-bold tracking-tight text-[var(--studelio-text)]">
                  {PRICE_LABEL[plan]}
                </span>
                <span className="text-sm text-muted-foreground">/ mois après l’essai</span>
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--studelio-text-body)]">{PITCH[plan]}</p>
              <Button
                type="button"
                variant={recommended ? "default" : "outline"}
                disabled={!stripeConfigured || alreadyPaid || loading !== null}
                className="mt-6 w-full rounded-full"
                onClick={() => choose(plan)}
              >
                {loading === plan
                  ? "Redirection…"
                  : alreadyPaid
                    ? "Déjà abonné·e"
                    : stripeConfigured
                      ? "Commencer les 3 jours gratuits"
                      : "Stripe non configuré"}
              </Button>
            </div>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="text-center lg:text-left">
          <h2 className="font-display text-xl font-semibold text-[var(--studelio-text)]">Comparatif détaillé</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ce qui est inclus dans chaque offre — et ce qui ne l’est pas. Zéro surprise.
          </p>
        </div>

        <div className="overflow-x-auto rounded-[20px] border border-[var(--studelio-border)] bg-card shadow-[var(--studelio-shadow)]">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)]/50">
                <th className="px-4 py-4 text-left font-display text-base font-semibold text-[var(--studelio-text)]">
                  Fonctionnalité
                </th>
                {PLANS.map((plan) => (
                  <th
                    key={plan}
                    className={cn(
                      "px-3 py-4 text-center font-display text-base font-semibold",
                      plan === "STANDARD"
                        ? "bg-[var(--studelio-blue-dim)]/50 text-[var(--studelio-text)]"
                        : "text-[var(--studelio-text)]",
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{planLabel[plan]}</span>
                      <span className="text-xs font-normal text-muted-foreground">{PRICE_LABEL[plan]}/mois</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-[var(--studelio-border)]/80 last:border-0">
                  <td className="max-w-[14rem] px-4 py-3 text-[var(--studelio-text-body)] sm:max-w-none">{row.label}</td>
                  {PLANS.map((plan) => (
                    <td key={plan} className={cn("align-middle", plan === "STANDARD" ? "bg-[var(--studelio-blue-dim)]/15" : "")}>
                      <Cell included={row.plans[plan]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-muted-foreground lg:text-left">
          Les examens blancs, corrections par enseignant et accès anticipé aux nouveautés sont réservés à l’offre
          Excellence. L’accès parent / tuteur commence à Progression.
        </p>
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3 border-t border-[var(--studelio-border)] pt-8 lg:justify-start">
        <Link href="/app/dashboard" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          Aller au tableau de bord
        </Link>
        <Link href="/onboarding" className={cn(buttonVariants({ variant: "ghost" }), "rounded-full")}>
          Retour à l’étape précédente
        </Link>
      </div>
    </div>
  );
}
