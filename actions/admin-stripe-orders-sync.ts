"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { recordStudelioOrderFromCheckout } from "@/lib/stripe-record-order";
import { getStripe } from "@/lib/stripe";

export type SyncStripeOrdersResult = { ok: true; message: string; sessionsChecked: number } | { ok: false; message: string };

const MAX_PAGES = 10;
const PAGE_SIZE = 100;
const LOOKBACK_DAYS = 90;

function isStudelioCheckoutSession(session: {
  mode: string | null;
  metadata?: { userId?: string | null; studelioKind?: string | null } | null;
}): boolean {
  const userId = session.metadata?.userId?.trim();
  if (!userId) return false;
  if (session.mode === "subscription") return true;
  if (session.mode === "payment" && session.metadata?.studelioKind === "blanc_addon") return true;
  return false;
}

/**
 * Réimporte les commandes Studelio depuis Stripe (sessions Checkout complétées).
 * Idempotent avec le webhook : les doublons sont ignorés côté base.
 */
export async function syncStripeCheckoutOrdersForAdmin(): Promise<SyncStripeOrdersResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "Accès réservé aux administrateurs." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, message: "Stripe non configuré (STRIPE_SECRET_KEY)." };
  }

  const createdGte = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 24 * 60 * 60;
  let sessionsChecked = 0;
  let startingAfter: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await stripe.checkout.sessions.list({
      limit: PAGE_SIZE,
      status: "complete",
      created: { gte: createdGte },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const row of res.data) {
      if (!isStudelioCheckoutSession(row)) continue;
      sessionsChecked += 1;
      await recordStudelioOrderFromCheckout(stripe, row.id);
    }

    if (!res.has_more || res.data.length === 0) break;
    startingAfter = res.data[res.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  revalidatePath("/admin/commandes");
  return {
    ok: true,
    message:
      sessionsChecked === 0
        ? `Aucune session Studelio complétée trouvée sur les ${LOOKBACK_DAYS} derniers jours (vérifie le mode test/live de ta clé Stripe et que des paiements ont bien été finalisés dans Checkout).`
        : `${sessionsChecked} session(s) Studelio analysée(s) sur les ${LOOKBACK_DAYS} derniers jours. Les commandes déjà en base sont ignorées ; les manquantes ont été créées si possible.`,
    sessionsChecked,
  };
}
