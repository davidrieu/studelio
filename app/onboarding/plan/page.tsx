import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlanPicker } from "./plan-picker";

export default async function OnboardingPlanPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }
  if (session.user.role !== "STUDENT") {
    redirect("/parent/dashboard");
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompletedAt: true },
  });
  if (!profile?.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });

  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ESSENTIEL &&
      process.env.STRIPE_PRICE_STANDARD &&
      process.env.STRIPE_PRICE_INTENSIF,
  );

  const checkout = searchParams.checkout;
  const canceledCheckout = checkout === "canceled";

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--studelio-text)]">
          Choisis l’offre qui colle à ton objectif
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--studelio-text-body)]">
          Toutes les offres incluent <strong className="font-medium text-[var(--studelio-text)]">3 jours d’essai gratuits</strong>
          . Après l’essai, facturation au tarif choisi — résilie avant la fin des 3 jours si tu ne souhaites pas continuer.
          Paiement sécurisé par Stripe.
        </p>
      </div>
      <PlanPicker
        stripeConfigured={stripeConfigured}
        subscriptionStatus={sub?.status ?? "INCOMPLETE"}
        canceledCheckout={canceledCheckout}
      />
    </div>
  );
}
