import { NextResponse } from "next/server";
import type { Plan } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appOrigin, getPriceIdForPlan, getStripe } from "@/lib/stripe";

const plans: Plan[] = ["ESSENTIEL", "STANDARD", "INTENSIF"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const plan = (body as { plan?: string }).plan;
  if (!plan || !plans.includes(plan as Plan)) {
    return NextResponse.json({ error: "Plan inconnu." }, { status: 400 });
  }

  const stripe = getStripe();
  const priceId = getPriceIdForPlan(plan as Plan);
  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: "Paiement indisponible (Stripe ou tarifs non configurés sur le serveur)." },
      { status: 503 },
    );
  }

  const origin = appOrigin();
  if (!origin) {
    return NextResponse.json({ error: "AUTH_URL / NEXTAUTH_URL manquant." }, { status: 500 });
  }

  const subRow = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { email: true } } },
  });

  if (!subRow) {
    return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
  }

  let customerId = subRow.stripeCustomerId;
  if (customerId.startsWith("pending_")) {
    const customer = await stripe.customers.create({
      email: subRow.user.email ?? undefined,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/app/dashboard?checkout=success`,
    cancel_url: `${origin}/onboarding/plan?checkout=canceled`,
    metadata: {
      userId: session.user.id,
      plan,
    },
    subscription_data: {
      trial_period_days: 3,
      metadata: {
        userId: session.user.id,
        plan,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_update: { address: "auto" },
  });

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
