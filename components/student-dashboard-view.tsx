import Link from "next/link";
import { Timer, UserRound, CreditCard } from "lucide-react";
import type { SubStatus } from "@prisma/client";
import { AddParentTutorForm } from "@/components/add-parent-tutor-form";
import { StudentDashboardCharts } from "@/components/student-dashboard-charts";
import { StudentDashboardQuickLinks } from "@/components/student-dashboard-quick-links";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

function greetingForHour(hour: number) {
  if (hour < 5) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

function subStatusPillClass(status: SubStatus) {
  switch (status) {
    case "TRIALING":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-100";
    case "ACTIVE":
      return "bg-emerald-500/12 text-emerald-900 dark:text-emerald-100";
    case "PAST_DUE":
      return "bg-orange-500/15 text-orange-900 dark:text-orange-100";
    case "INCOMPLETE":
      return "bg-sky-500/12 text-sky-900 dark:text-sky-100";
    case "CANCELED":
    default:
      return "bg-muted text-muted-foreground";
  }
}

function shortBlancLabel(label: string) {
  if (label.length <= 22) return label;
  return `${label.slice(0, 20)}…`;
}

export function StudentDashboardView(props: {
  checkoutOk: boolean;
  firstName: string;
  niveauLabel: string;
  programmeTitle: string | null;
  lastSessionAt: Date | null;
  streakDays: number;
  totalMinutes: number;
  chatSessionsCount: number;
  blancEnrollmentsCount: number;
  epreuveShortLabel: string;
  planLabelText: string | null;
  subStatusText: string | null;
  subStatus: SubStatus | null;
  parentEmail: string | null;
}) {
  const hour = new Date().getHours();
  const greet = greetingForHour(hour);
  const totalFmt = formatMinutes(props.totalMinutes);

  return (
    <div className="space-y-10 pb-4">
      {props.checkoutOk ? (
        <p
          className="rounded-2xl border border-[var(--studelio-green-dim)] bg-[var(--studelio-green-dim)] px-4 py-3 text-sm text-[var(--studelio-text)] shadow-sm"
          role="status"
        >
          Merci ! Paiement reçu. Ton abonnement se met à jour en quelques secondes via Stripe — actualise la page si le
          statut reste « À finaliser ».
        </p>
      ) : null}

      <section
        className={cn(
          "relative overflow-hidden rounded-[28px] border border-[var(--studelio-border)]",
          "bg-gradient-to-br from-[var(--studelio-bg-soft)] via-card to-[var(--studelio-bg-muted)]/80",
          "p-8 shadow-[var(--studelio-shadow)] sm:p-10",
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--studelio-blue)]/[0.07] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-violet-500/[0.06] blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-[var(--studelio-text-muted)]">{greet}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-[var(--studelio-text)] sm:text-4xl">
            {props.firstName}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--studelio-text-body)]">
            Niveau <span className="font-semibold text-[var(--studelio-text)]">{props.niveauLabel}</span>
            {props.programmeTitle ? (
              <>
                {" "}
                · Programme{" "}
                <span className="font-semibold text-[var(--studelio-text)]">{props.programmeTitle}</span>
              </>
            ) : null}
          </p>
          {props.lastSessionAt ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--studelio-border)] bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
              <Timer className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              Dernière activité :{" "}
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(props.lastSessionAt)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--studelio-text)]">
            Tes indicateurs
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Série, temps passé, échanges avec André et inscriptions aux épreuves — avec des graphiques pour visualiser
            ton rythme (repères visuels, pas des notes).
          </p>
        </div>
        <StudentDashboardCharts
          streakDays={props.streakDays}
          totalMinutes={props.totalMinutes}
          totalMinutesFormatted={totalFmt}
          chatSessionsCount={props.chatSessionsCount}
          blancEnrollmentsCount={props.blancEnrollmentsCount}
          blancAxisLabel={shortBlancLabel(props.epreuveShortLabel)}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Série : jours consécutifs avec au moins une activité (fuseau Europe/Paris), après André ou ta progression
          programme. Les pourcentages des barres comparent tes chiffres à des plafonds indicatifs pour la lisibilité du
          graphique.
        </p>
      </section>

      <section aria-labelledby="quick-links-heading">
        <StudentDashboardQuickLinks epreuveShortLabel={props.epreuveShortLabel} />
      </section>

      <section className="rounded-[24px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <div className="flex items-center gap-2 text-[var(--studelio-text)]">
          <UserRound className="h-5 w-5 text-[var(--studelio-blue)]" aria-hidden />
          <h2 className="font-display text-lg font-semibold">Parent ou tuteur</h2>
        </div>
        {props.parentEmail ? (
          <p className="mt-4 text-sm leading-relaxed text-[var(--studelio-text-body)]">
            Compte relié :{" "}
            <span className="font-medium break-all text-[var(--studelio-text)]">{props.parentEmail}</span>. Le parent
            se connecte avec cette adresse et le mot de passe que tu as défini. Tu peux mettre à jour la liaison
            ci-dessous.
          </p>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Ajoute l’email et le mot de passe du compte parent ou tuteur. Aucun email automatique : transmets les
            identifiants toi-même.
          </p>
        )}
        <div className="mt-6 border-t border-[var(--studelio-border)]/80 pt-6">
          <AddParentTutorForm />
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <div className="flex items-center gap-2 text-[var(--studelio-text)]">
          <CreditCard className="h-5 w-5 text-[var(--studelio-blue)]" aria-hidden />
          <h2 className="font-display text-lg font-semibold">Plan actuel</h2>
        </div>
        {props.planLabelText && props.subStatusText && props.subStatus ? (
          <dl className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Offre</dt>
              <dd className="mt-1 text-xl font-semibold text-[var(--studelio-text)]">{props.planLabelText}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Statut</dt>
              <dd className="mt-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    subStatusPillClass(props.subStatus),
                  )}
                >
                  {props.subStatusText}
                </span>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Aucune donnée d’abonnement.</p>
        )}
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Les offres incluent 3 jours d’essai. Le statut se met à jour automatiquement après paiement.
        </p>
        <Link
          href="/onboarding/plan"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-5 inline-flex rounded-full")}
        >
          Voir les plans
        </Link>
      </section>
    </div>
  );
}
