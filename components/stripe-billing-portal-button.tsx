"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function StripeBillingPortalButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Impossible d’ouvrir le portail.");
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setError("Réponse Stripe inattendue.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        disabled={disabled || loading}
        onClick={() => void openPortal()}
      >
        {loading ? "Redirection…" : "Gérer paiement, factures et abonnement"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
