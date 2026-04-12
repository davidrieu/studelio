"use client";

import { useState } from "react";
import Link from "next/link";
import type { Plan, SubStatus } from "@prisma/client";
import { planLabel } from "@/lib/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tier = {
  plan: Plan;
  blurb: string;
  highlights: string[];
};

const tiers: Tier[] = [
  {
    plan: "ESSENTIEL",
    blurb: "Pour avancer sereinement sur les bases.",
    highlights: ["Aide aux devoirs avec André", "Programme adapté à ton niveau", "2 bacs blancs corrigés / trimestre"],
  },
  {
    plan: "STANDARD",
    blurb: "Plus de pratique et un suivi renforcé.",
    highlights: ["Tout Essentiel", "Sessions André étendues", "Rapports parent hebdo"],
  },
  {
    plan: "INTENSIF",
    blurb: "Préparation max et accompagnement serré.",
    highlights: ["Tout Standard", "Priorité sur les corrections", "Objectif examen"],
  },
];

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
    <div className="space-y-8">
      {canceledCheckout ? (
        <p className="rounded-xl border border-[var(--studelio-border)] bg-card px-4 py-3 text-sm text-[var(--studelio-text-body)]">
          Paiement annulé. Tu peux choisir un autre plan ou réessayer quand tu veux.
        </p>
      ) : null}
      {alreadyPaid ? (
        <p className="rounded-xl border border-[var(--studelio-green-dim)] bg-[var(--studelio-green-dim)] px-4 py-3 text-sm text-[var(--studelio-text)]">
          Ton abonnement est déjà actif ou en essai. Tu peux aller sur ton tableau de bord.
        </p>
      ) : null}
      {!stripeConfigured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Les clés Stripe ne sont pas configurées sur ce serveur. En local ou sans tarifs Price ID, passe directement au
          tableau de bord pour continuer le développement.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.plan}
            className="flex flex-col rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]"
          >
            <h2 className="font-display text-xl font-semibold text-[var(--studelio-text)]">{planLabel[tier.plan]}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tier.blurb}</p>
            <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-[var(--studelio-text-body)]">
              {tier.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span aria-hidden className="text-[var(--studelio-blue)]">
                    ·
                  </span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={!stripeConfigured || alreadyPaid || loading !== null}
              onClick={() => choose(tier.plan)}
              className={cn(
                buttonVariants({ variant: tier.plan === "STANDARD" ? "default" : "outline" }),
                "mt-6 w-full rounded-full",
              )}
            >
              {loading === tier.plan ? "Redirection…" : alreadyPaid ? "Déjà abonné·e" : "Payer avec Stripe"}
            </button>
          </div>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
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
