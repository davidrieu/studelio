"use client";

import { useState, useTransition } from "react";
import { syncStripeCheckoutOrdersForAdmin } from "@/actions/admin-stripe-orders-sync";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminSyncStripeOrdersButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const r = await syncStripeCheckoutOrdersForAdmin();
      if (r.ok) setMessage(r.message);
      else setError(r.message);
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-fit rounded-full")}
      >
        {pending ? "Synchronisation avec Stripe…" : "Importer les commandes depuis Stripe"}
      </button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
