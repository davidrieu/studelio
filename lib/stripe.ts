import Stripe from "stripe";
import type { Plan } from "@prisma/client";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { typescript: true });
}

export function getPriceIdForPlan(plan: Plan): string | null {
  const map: Record<Plan, string | undefined> = {
    ESSENTIEL: process.env.STRIPE_PRICE_ESSENTIEL,
    STANDARD: process.env.STRIPE_PRICE_STANDARD,
    INTENSIF: process.env.STRIPE_PRICE_INTENSIF,
  };
  const id = map[plan];
  return id && id.length > 0 ? id : null;
}

export function planFromStripePriceId(priceId: string): Plan {
  if (priceId === process.env.STRIPE_PRICE_STANDARD) return "STANDARD";
  if (priceId === process.env.STRIPE_PRICE_INTENSIF) return "INTENSIF";
  return "ESSENTIEL";
}

export function appOrigin(): string {
  const u = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  return u.replace(/\/$/, "");
}

/** Identifiant client Stripe réel (après au moins un Checkout ou création API). */
export function isStripeCustomerId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("cus_");
}
