import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, planFromStripePriceId } from "@/lib/stripe";
import { stripeSubscriptionToSubStatus } from "@/lib/stripe-subscription";

export const dynamic = "force-dynamic";

function priceIdFromSubscription(sub: Stripe.Subscription): string | undefined {
  const item = sub.items?.data?.[0];
  const p = item?.price;
  if (!p) return undefined;
  return typeof p === "string" ? p : p.id;
}

function periodEndFromSubscription(sub: Stripe.Subscription): Date | undefined {
  const end = sub.items?.data?.[0]?.current_period_end;
  if (typeof end !== "number") return undefined;
  return new Date(end * 1000);
}

function customerIdFromStripe(sub: Stripe.Subscription): string | undefined {
  const c = sub.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c && typeof c.id === "string") return c.id;
  return undefined;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !whSecret) {
    return new NextResponse("Webhook Stripe non configuré.", { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Signature manquante.", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch {
    return new NextResponse("Signature invalide.", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode !== "subscription") break;
        const userId = s.metadata?.userId;
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (!userId || !subId || !customerId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = priceIdFromSubscription(sub);
        if (!priceId) break;

        const plan = planFromStripePriceId(priceId);
        const status = stripeSubscriptionToSubStatus(sub.status);
        const periodEnd = periodEndFromSubscription(sub);

        await prisma.subscription.update({
          where: { userId },
          data: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            plan,
            status,
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
          },
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = customerIdFromStripe(sub);
        if (!customerId) break;

        const priceId = priceIdFromSubscription(sub);
        const plan = priceId ? planFromStripePriceId(priceId) : undefined;
        const status =
          event.type === "customer.subscription.deleted"
            ? ("CANCELED" as const)
            : stripeSubscriptionToSubStatus(sub.status);

        const row =
          (await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } })) ??
          (await prisma.subscription.findUnique({ where: { stripeCustomerId: customerId } }));

        if (!row) break;

        const nextPeriodEnd = periodEndFromSubscription(sub);

        await prisma.subscription.update({
          where: { userId: row.userId },
          data: {
            stripeSubscriptionId: sub.id,
            ...(priceId ? { stripePriceId: priceId, plan } : {}),
            status,
            currentPeriodEnd:
              event.type === "customer.subscription.deleted"
                ? row.currentPeriodEnd
                : nextPeriodEnd ?? row.currentPeriodEnd,
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", e);
    return new NextResponse("Erreur traitement webhook.", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
