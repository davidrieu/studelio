import type { OrderKind, OrderStatus } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

function mapOrderStatus(session: Stripe.Checkout.Session): OrderStatus {
  if (session.status === "expired") return "CANCELED";
  if (session.payment_status === "paid") return "COMPLETED";
  if (session.payment_status === "no_payment_required") return "COMPLETED";
  return "PENDING";
}

function resolveStudelioKind(session: Stripe.Checkout.Session): OrderKind | null {
  if (session.mode === "payment" && session.metadata?.studelioKind === "blanc_addon") {
    return "BLANC_ADDON";
  }
  if (session.mode === "subscription" && session.metadata?.userId) {
    return "SUBSCRIPTION";
  }
  return null;
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "string") return pi;
  if (pi && typeof pi === "object" && "id" in pi && typeof pi.id === "string") return pi.id;
  return null;
}

function subscriptionId(session: Stripe.Checkout.Session): string | null {
  const sub = session.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub && typeof sub.id === "string") return sub.id;
  return null;
}

function productName(product: Stripe.Product | string): string {
  if (typeof product === "string") return `Produit ${product}`;
  return product.name || "Article";
}

/**
 * Enregistre une commande admin (idempotent sur `stripeCheckoutSessionId`).
 * À appeler après traitement métier du webhook `checkout.session.completed`.
 */
export async function recordStudelioOrderFromCheckout(
  stripe: Stripe,
  checkoutSessionId: string,
): Promise<void> {
  const full = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["line_items.data.price.product"],
  });

  const kind = resolveStudelioKind(full);
  if (!kind) return;

  const userId = full.metadata?.userId?.trim();
  if (!userId) return;

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) {
    console.warn("[stripe-record-order] userId inconnu, commande ignorée:", userId);
    return;
  }

  const status = mapOrderStatus(full);
  const amount = typeof full.amount_total === "number" ? full.amount_total : 0;
  const currency = (full.currency ?? "eur").toLowerCase();
  const email =
    full.customer_details?.email?.trim() ??
    (typeof full.customer_email === "string" ? full.customer_email.trim() : null) ??
    null;

  const linesPayload: {
    label: string;
    quantity: number;
    unitAmountCents: number;
    stripePriceId: string | null;
  }[] = [];

  for (const item of full.line_items?.data ?? []) {
    const qty = item.quantity ?? 1;
    const price = item.price;
    let label = "Article";
    let stripePriceId: string | null = null;
    let unitAmountCents = 0;

    if (price && typeof price === "object") {
      stripePriceId = price.id;
      unitAmountCents =
        typeof price.unit_amount === "number" ? price.unit_amount : Math.round((item.amount_total ?? 0) / qty);
      const prod = price.product;
      if (prod && typeof prod === "object" && "name" in prod) {
        label = productName(prod as Stripe.Product);
      }
    } else {
      unitAmountCents = qty > 0 ? Math.round((item.amount_total ?? 0) / qty) : 0;
    }

    linesPayload.push({
      label,
      quantity: qty,
      unitAmountCents,
      stripePriceId,
    });
  }

  if (linesPayload.length === 0 && kind === "BLANC_ADDON") {
    const tier = full.metadata?.tier;
    linesPayload.push({
      label:
        tier === "slot_pro"
          ? "Examen blanc — inscription + correction enseignant"
          : "Examen blanc — inscription créneau",
      quantity: 1,
      unitAmountCents: amount,
      stripePriceId: null,
    });
  }

  if (linesPayload.length === 0 && kind === "SUBSCRIPTION") {
    const plan = full.metadata?.plan ?? "abonnement";
    linesPayload.push({
      label: `Abonnement Studelio (${plan})`,
      quantity: 1,
      unitAmountCents: amount,
      stripePriceId: null,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const dup = await tx.order.findUnique({
        where: { stripeCheckoutSessionId: full.id },
        select: { id: true },
      });
      if (dup) return;

      await tx.order.create({
        data: {
          stripeCheckoutSessionId: full.id,
          userId,
          kind,
          status,
          currency,
          totalAmountCents: amount,
          stripePaymentIntentId: paymentIntentId(full),
          stripeSubscriptionId: subscriptionId(full),
          customerEmail: email,
          lines: { create: linesPayload },
        },
      });
    });
  } catch (e) {
    console.error("[stripe-record-order]", e);
  }
}

/** Session expirée avant paiement : marquer commande brouillon si elle existait. */
export async function markOrderCanceledIfPending(checkoutSessionId: string): Promise<void> {
  await prisma.order.updateMany({
    where: { stripeCheckoutSessionId: checkoutSessionId, status: "PENDING" },
    data: { status: "CANCELED" },
  });
}
