import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StripeBillingPortalButton } from "@/components/stripe-billing-portal-button";
import { buttonVariants } from "@/components/ui/button";
import { niveauLabel, planLabel, subStatusLabel, tagLabel } from "@/lib/labels";
import { isStripeCustomerId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { subscriptionGrantsAppAccess } from "@/lib/subscription-entitlement";
import { cn } from "@/lib/utils";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true, studentProfile: true },
  });

  if (!user) {
    redirect("/auth/login?session=required");
  }

  const sub = user.subscription;
  const sp = user.studentProfile;
  const showBillingPortal =
    Boolean(sub && subscriptionGrantsAppAccess(sub) && isStripeCustomerId(sub.stripeCustomerId));

  return (
    <div className="space-y-6">
      <header className="rounded-[20px] border border-[var(--studelio-border)] bg-gradient-to-br from-[var(--studelio-bg-soft)] to-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">Paramètres</h1>
        <p className="mt-2 text-sm text-[var(--studelio-text-body)]">
          Compte, profil élève et abonnement. La modification du mot de passe et du thème arriveront dans une prochaine
          version.
        </p>
      </header>

      <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Compte</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="font-medium text-[var(--studelio-text)]">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Nom affiché</dt>
            <dd className="font-medium text-[var(--studelio-text)]">{user.name ?? "—"}</dd>
          </div>
        </dl>
      </section>

      {sp ? (
        <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
          <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Profil élève</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Données issues de l’onboarding. Pour les modifier, contacte le support ou attends la future page d’édition.
          </p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Niveau</dt>
              <dd className="font-medium text-[var(--studelio-text)]">{niveauLabel[sp.niveau]}</dd>
            </div>
            {sp.interests.length > 0 ? (
              <div>
                <dt className="text-muted-foreground">Centres d’intérêt</dt>
                <dd className="text-[var(--studelio-text-body)]">{sp.interests.join(", ")}</dd>
              </div>
            ) : null}
            {sp.tags.length > 0 ? (
              <div>
                <dt className="text-muted-foreground">Profil déclaré</dt>
                <dd className="text-[var(--studelio-text-body)]">{sp.tags.map((t) => tagLabel[t]).join(", ")}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Modifier niveau, intérêts ou tags depuis cette page : bientôt disponible.
          </p>
        </section>
      ) : null}

      <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Abonnement</h2>
        {sub ? (
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium text-[var(--studelio-text)]">{planLabel[sub.plan]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Statut Stripe</dt>
              <dd className="font-medium text-[var(--studelio-text)]">{subStatusLabel[sub.status]}</dd>
            </div>
            {sub.currentPeriodEnd ? (
              <div>
                <dt className="text-muted-foreground">Fin de période</dt>
                <dd className="font-medium text-[var(--studelio-text)]">
                  {sub.currentPeriodEnd.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Aucune donnée d’abonnement.</p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Link href="/onboarding/plan" className={cn(buttonVariants(), "rounded-full")}>
              Voir les plans
            </Link>
            {showBillingPortal ? <StripeBillingPortalButton /> : null}
          </div>
          {showBillingPortal ? (
            <p className="max-w-xl text-xs text-muted-foreground">
              Le portail Stripe te permet de mettre à jour la carte, télécharger les factures ou résilier. Active d’abord
              le portail client dans le Dashboard Stripe (mode test ou live) : Paramètres → Portail client.
            </p>
          ) : sub && subscriptionGrantsAppAccess(sub) ? (
            <p className="max-w-xl text-xs text-muted-foreground">
              Après ton premier paiement d’abonnement, le bouton « Gérer paiement… » apparaîtra ici pour ouvrir le
              portail Stripe.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
