import type { ComponentType } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Flame,
  MessageCircle,
  Mic,
  Sparkles,
  Timer,
  UserRound,
  CreditCard,
} from "lucide-react";
import type { SubStatus } from "@prisma/client";
import { AddParentTutorForm } from "@/components/add-parent-tutor-form";
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

  const quickLinks = [
    {
      href: "/app/andre",
      title: "André",
      description: "Pose tes questions, prépare un exposé ou une rédaction.",
      icon: Sparkles,
      accent: "from-violet-500/10 to-[var(--studelio-blue)]/5",
    },
    {
      href: "/app/programme/seance",
      title: "Ma séance",
      description: "Enchaîne les exercices de ton programme personnalisé.",
      icon: BookOpen,
      accent: "from-[var(--studelio-blue)]/12 to-transparent",
    },
    {
      href: "/app/dictee",
      title: "Dictée",
      description: "Entraîne-toi avec les dictées audio du programme.",
      icon: Mic,
      accent: "from-teal-500/10 to-transparent",
    },
    {
      href: "/app/bac-blanc",
      title: props.epreuveShortLabel,
      description: "Inscriptions, créneaux et suivi de tes épreuves blanches.",
      icon: CalendarDays,
      accent: "from-rose-500/10 to-transparent",
    },
  ] as const;

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

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,340px)] lg:items-start lg:gap-10">
        <div className="space-y-10">
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
              <p className="text-sm font-medium uppercase tracking-[0.12em] text-[var(--studelio-text-muted)]">
                {greet}
              </p>
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

          <section>
            <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--studelio-text)]">
              Accès rapide
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Les essentiels pour avancer aujourd’hui.</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex h-full flex-col gap-3 rounded-2xl border border-[var(--studelio-border)] bg-card p-5",
                      "shadow-[var(--studelio-shadow)] transition-all duration-200",
                      "hover:-translate-y-0.5 hover:border-[var(--studelio-blue)]/25 hover:shadow-lg",
                    )}
                  >
                    <div
                      className={cn(
                        "flex w-full items-start justify-between gap-3 rounded-xl bg-gradient-to-br p-0.5",
                        item.accent,
                      )}
                    >
                      <span className="inline-flex rounded-xl bg-[var(--studelio-blue-dim)] p-2.5 text-[var(--studelio-blue)] ring-1 ring-[var(--studelio-border)]/60 transition group-hover:ring-[var(--studelio-blue)]/20">
                        <item.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground opacity-0 transition group-hover:opacity-100">
                        Ouvrir
                      </span>
                    </div>
                    <div>
                      <span className="font-display text-base font-semibold text-[var(--studelio-text)]">
                        {item.title}
                      </span>
                      <p className="mt-1 text-sm leading-snug text-muted-foreground">{item.description}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--studelio-text)]">
              Tes indicateurs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Un aperçu de ton engagement sur Studelio.</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                icon={Flame}
                label="Série (jours)"
                value={String(props.streakDays)}
                hint="Jours d’affilée avec au moins une activité (fuseau Europe/Paris), après André ou ta progression."
                highlight={props.streakDays >= 3}
              />
              <StatTile icon={Timer} label="Temps sur Studelio" value={totalFmt} />
              <StatTile
                icon={MessageCircle}
                label="Discussions avec André"
                value={String(props.chatSessionsCount)}
              />
              <StatTile
                icon={CalendarDays}
                label={`Inscriptions ${props.epreuveShortLabel.toLowerCase()}`}
                value={String(props.blancEnrollmentsCount)}
                hint="Créneaux auxquels tu es inscrit·e"
              />
            </ul>
          </section>
        </div>

        <aside className="mt-10 space-y-6 lg:mt-0 lg:sticky lg:top-24">
          <section className="rounded-[24px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
            <div className="flex items-center gap-2 text-[var(--studelio-text)]">
              <CreditCard className="h-4 w-4 text-[var(--studelio-blue)]" aria-hidden />
              <h2 className="font-display text-base font-semibold">Abonnement</h2>
            </div>
            {props.planLabelText && props.subStatusText && props.subStatus ? (
              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</dt>
                  <dd className="mt-1 text-lg font-semibold text-[var(--studelio-text)]">{props.planLabelText}</dd>
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
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full rounded-full sm:w-auto")}
            >
              Voir les plans
            </Link>
          </section>

          <section className="rounded-[24px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
            <div className="flex items-center gap-2 text-[var(--studelio-text)]">
              <UserRound className="h-4 w-4 text-[var(--studelio-blue)]" aria-hidden />
              <h2 className="font-display text-base font-semibold">Parent ou tuteur</h2>
            </div>
            {props.parentEmail ? (
              <p className="mt-4 text-sm leading-relaxed text-[var(--studelio-text-body)]">
                Compte relié :{" "}
                <span className="font-medium break-all text-[var(--studelio-text)]">{props.parentEmail}</span>. Le
                parent se connecte avec cette adresse et le mot de passe que tu as défini. Tu peux mettre à jour la
                liaison ci-dessous.
              </p>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Ajoute l’email et le mot de passe du compte parent ou tuteur. Aucun email automatique : transmets les
                identifiants toi-même.
              </p>
            )}
            <div className="mt-5 border-t border-[var(--studelio-border)]/80 pt-5">
              <AddParentTutorForm />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--studelio-border)] bg-card p-5 shadow-[var(--studelio-shadow)]",
        highlight && "ring-1 ring-amber-500/25",
      )}
    >
      {highlight ? (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] to-transparent"
          aria-hidden
        />
      ) : null}
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-[var(--studelio-blue)]/70" aria-hidden />
      </div>
      <p className="relative mt-2 font-display text-2xl font-semibold tabular-nums tracking-tight text-[var(--studelio-text)]">
        {value}
      </p>
      {hint ? <p className="relative mt-2 text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </li>
  );
}
