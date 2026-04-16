import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StripeBillingPortalButton } from "@/components/stripe-billing-portal-button";
import { StudentProfileSettingsForm } from "@/components/student-profile-settings-form";
import { buttonVariants } from "@/components/ui/button";
import { niveauLabel, planLabel, subStatusLabel } from "@/lib/labels";
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

  const profileFormKey = sp
    ? `${sp.niveau}|${[...sp.interests].sort().join(",")}|${[...sp.tags].sort().join(",")}`
    : "none";

  return (
    <div className="min-w-0 space-y-6">
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
            <dd className="break-all font-medium text-[var(--studelio-text)]">{user.email}</dd>
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
          <p className="mt-1 text-sm text-muted-foreground">
            Niveau actuel affiché sur ton tableau de bord :{" "}
            <span className="font-medium text-[var(--studelio-text)]">{niveauLabel[sp.niveau]}</span>. Tu peux tout
            modifier ci-dessous puis enregistrer.
          </p>
          <div className="mt-6 border-t border-[var(--studelio-border)]/80 pt-6">
            <StudentProfileSettingsForm
              key={profileFormKey}
              niveau={sp.niveau}
              interests={sp.interests}
              tags={sp.tags}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Abonnement</h2>
        {sub ? (
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Formule</dt>
              <dd className="font-medium text-[var(--studelio-text)]">{planLabel[sub.plan]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Statut</dt>
              <dd className="font-medium text-[var(--studelio-text)]">{subStatusLabel[sub.status]}</dd>
            </div>
            {sub.currentPeriodEnd ? (
              <div>
                <dt className="text-muted-foreground">Fin de période en cours</dt>
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
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              Tu peux mettre à jour ton moyen de paiement, consulter tes factures ou arrêter ton renouvellement automatique
              depuis l’espace sécurisé de paiement (même endroit qu’au moment de ton inscription).
            </p>
          ) : sub && subscriptionGrantsAppAccess(sub) ? (
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              Dès que ton premier paiement d’abonnement est bien pris en compte, le bouton « Gérer paiement, factures et
              abonnement » apparaît ici pour accéder à l’espace de gestion.
            </p>
          ) : (
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              Pour souscrire ou reprendre une formule, utilise « Voir les plans ».
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
