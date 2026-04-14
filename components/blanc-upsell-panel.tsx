"use client";

import { useState } from "react";
import { planLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tier = "slot" | "slot_pro";

export function BlancUpsellPanel({
  stripeConfigured,
  planName,
  creditsAvailable,
}: {
  stripeConfigured: boolean;
  planName: string;
  creditsAvailable: number;
}) {
  const [loading, setLoading] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(tier: Tier) {
    setError(null);
    setLoading(tier);
    try {
      const res = await fetch("/api/stripe/checkout-blanc-addon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Paiement indisponible.");
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setError("Réponse inattendue.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(null);
    }
  }

  if (creditsAvailable > 0) {
    return (
      <div className="rounded-[20px] border border-[var(--studelio-green-dim)] bg-[var(--studelio-green-dim)]/40 px-5 py-4 text-sm text-[var(--studelio-text)]">
        Tu as <strong className="font-semibold">{creditsAvailable}</strong> place{creditsAvailable > 1 ? "s" : ""}{" "}
        payée{creditsAvailable > 1 ? "s" : ""} pour un examen blanc — choisis un créneau ci-dessous pour t’inscrire.
      </div>
    );
  }

  return (
    <section className="space-y-5 rounded-[20px] border border-[var(--studelio-blue)]/30 bg-gradient-to-br from-[var(--studelio-blue-dim)]/60 via-card to-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--studelio-blue)]">Offre Excellence</p>
        <h2 className="mt-2 font-display text-xl font-semibold text-[var(--studelio-text)] sm:text-2xl">
          Les examens blancs sont inclus sans surcoût
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">
          Avec l’offre <strong className="font-medium text-[var(--studelio-text)]">{planLabel.INTENSIF}</strong>, tu
          accèdes aux créneaux, à la simulation et à la <strong className="font-medium">correction par un enseignant</strong>
          . Passe à Excellence quand tu veux depuis la page des plans.
        </p>
      </div>

      <div className="grid gap-4 border-t border-[var(--studelio-border)]/60 pt-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--studelio-border)] bg-card/80 p-5">
          <h3 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Une seule épreuve</h3>
          <p className="mt-2 text-sm text-[var(--studelio-text-body)]">
            Tu restes en <span className="font-medium">{planName}</span> et tu veux quand même t’inscrire à un créneau :{" "}
            <strong className="font-medium text-[var(--studelio-text)]">15&nbsp;€</strong> pour la participation (visio
            + suivi sur la plateforme).
          </p>
          <Button
            type="button"
            className="mt-4 w-full rounded-full"
            disabled={!stripeConfigured || loading !== null}
            onClick={() => pay("slot")}
          >
            {loading === "slot" ? "Redirection…" : `Payer 15\u00a0€ — une place`}
          </Button>
        </div>
        <div className="rounded-2xl border border-[var(--studelio-blue)]/40 bg-[var(--studelio-blue-dim)]/25 p-5">
          <h3 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Place + correction prof</h3>
          <p className="mt-2 text-sm text-[var(--studelio-text-body)]">
            Même créneau, avec en plus la <strong className="font-medium">correction par un enseignant</strong> :{" "}
            <strong className="font-medium text-[var(--studelio-text)]">20&nbsp;€</strong> au total (15&nbsp;€ + 5&nbsp;€).
          </p>
          <Button
            type="button"
            variant="default"
            className={cn("mt-4 w-full rounded-full")}
            disabled={!stripeConfigured || loading !== null}
            onClick={() => pay("slot_pro")}
          >
            {loading === "slot_pro" ? "Redirection…" : `Payer 20\u00a0€ — place + correction`}
          </Button>
        </div>
      </div>

      {!stripeConfigured ? (
        <p className="text-xs text-muted-foreground">
          Stripe n’est pas configuré sur ce serveur : les boutons de paiement sont désactivés.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
