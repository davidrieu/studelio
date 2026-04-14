import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appOrigin, getStripe } from "@/lib/stripe";
import { planIncludesBlancInSubscription, subscriptionGrantsAppAccess } from "@/lib/subscription-entitlement";

const AMOUNT_SLOT_CENTS = 1500;
const AMOUNT_SLOT_PRO_CENTS = 2000;

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

  const tier = (body as { tier?: string }).tier;
  if (tier !== "slot" && tier !== "slot_pro") {
    return NextResponse.json({ error: "Offre invalide." }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const origin = appOrigin();
  if (!origin) {
    return NextResponse.json({ error: "AUTH_URL / NEXTAUTH_URL manquant." }, { status: 500 });
  }

  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, subscription: { select: { plan: true, status: true, stripeCustomerId: true } } },
  });
  if (!userRow?.subscription || !subscriptionGrantsAppAccess(userRow.subscription)) {
    return NextResponse.json({ error: "Abonnement actif requis." }, { status: 403 });
  }
  if (planIncludesBlancInSubscription(userRow.subscription.plan)) {
    return NextResponse.json(
      { error: "Les examens blancs sont déjà inclus dans ton offre Excellence." },
      { status: 400 },
    );
  }

  const unitAmount = tier === "slot_pro" ? AMOUNT_SLOT_PRO_CENTS : AMOUNT_SLOT_CENTS;
  const productName =
    tier === "slot_pro"
      ? "Examen blanc — inscription + correction enseignant"
      : "Examen blanc — inscription créneau";
  const productDescription =
    tier === "slot_pro"
      ? "Une place sur un créneau Studelio, avec correction par un enseignant."
      : "Une place sur un créneau Studelio (sans correction enseignant).";

  let customerId: string | undefined;
  const cid = userRow.subscription.stripeCustomerId;
  if (cid && !cid.startsWith("pending_")) {
    customerId = cid;
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    ...(customerId ? { customer: customerId } : { customer_email: userRow.email ?? undefined }),
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: productName,
            description: productDescription,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/app/bac-blanc?blanc_pay=ok`,
    cancel_url: `${origin}/app/bac-blanc?blanc_pay=cancel`,
    metadata: {
      userId: session.user.id,
      studelioKind: "blanc_addon",
      tier,
    },
    payment_intent_data: {
      metadata: {
        userId: session.user.id,
        studelioKind: "blanc_addon",
        tier,
      },
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
