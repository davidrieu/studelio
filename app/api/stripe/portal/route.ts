import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appOrigin, getStripe, isStripeCustomerId } from "@/lib/stripe";
import { subscriptionGrantsAppAccess } from "@/lib/subscription-entitlement";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const origin = appOrigin();
  if (!origin) {
    return NextResponse.json({ error: "AUTH_URL / NEXTAUTH_URL manquant." }, { status: 500 });
  }

  const subRow = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true, status: true },
  });

  if (!subRow || !subscriptionGrantsAppAccess(subRow)) {
    return NextResponse.json(
      { error: "Un abonnement actif ou en essai est nécessaire pour ouvrir le portail." },
      { status: 403 },
    );
  }

  if (!isStripeCustomerId(subRow.stripeCustomerId)) {
    return NextResponse.json(
      {
        error:
          "Compte Stripe client introuvable. Finalise d’abord un paiement d’abonnement depuis la page des plans, puis réessaie.",
      },
      { status: 400 },
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: subRow.stripeCustomerId,
    return_url: `${origin}/app/settings`,
  });

  if (!portal.url) {
    return NextResponse.json({ error: "Impossible de créer la session portail." }, { status: 500 });
  }

  return NextResponse.json({ url: portal.url });
}
