import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BlancCopieForm } from "@/components/blanc-copie-form";
import { BlancEnrollButton, BlancUnenrollButton } from "@/components/blanc-slot-actions";
import { BlancUpsellPanel } from "@/components/blanc-upsell-panel";
import { buttonVariants } from "@/components/ui/button";
import { blancKindForNiveau, blancKindLabel, epreuveBlancheShortLabel } from "@/lib/blanc-kind";
import { bacBlancStatusLabel, planLabel } from "@/lib/labels";
import { planIncludesBlancInSubscription } from "@/lib/subscription-entitlement";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function formatVisioDateTime(d: Date) {
  return d.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function EpreuvesBlanchesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { niveau: true },
  });
  if (!profile) {
    redirect("/onboarding");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { plan: true, status: true },
  });
  const plan = subscription?.plan ?? "ESSENTIEL";
  const blancIncludedInPlan = planIncludesBlancInSubscription(plan);

  const creditsAvailable = await prisma.blancOneTimePurchase.count({
    where: { userId: session.user.id, consumedAt: null },
  });

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const canEnrollNewSlot = blancIncludedInPlan || creditsAvailable > 0;

  const kind = blancKindForNiveau(profile.niveau);
  const pageTitle = epreuveBlancheShortLabel(profile.niveau);
  const now = new Date();

  const blancPay = firstParam(searchParams?.blanc_pay);

  const myEnrollments = await prisma.blancEnrollment.findMany({
    where: { userId: session.user.id, slot: { kind } },
    include: {
      slot: true,
    },
    orderBy: [{ slot: { visioAt: "asc" } }, { createdAt: "asc" }],
  });

  const enrolledSlotIds = new Set(myEnrollments.map((e) => e.slotId));

  const slots = await prisma.blancSlot.findMany({
    where: {
      published: true,
      kind,
      OR: [{ closesAt: null }, { closesAt: { gt: now } }],
    },
    orderBy: [{ visioAt: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { enrollments: true } },
    },
  });

  const openToJoin = slots.filter((s) => !enrolledSlotIds.has(s.id));

  return (
    <div className="space-y-8">
      {blancPay === "ok" ? (
        <p
          className="rounded-[16px] border border-[var(--studelio-green-dim)] bg-[var(--studelio-green-dim)] px-4 py-3 text-sm text-[var(--studelio-text)]"
          role="status"
        >
          Paiement reçu. Ta place pour un examen blanc est disponible — choisis un créneau ci-dessous (ou actualise si
          le message tarde).
        </p>
      ) : null}
      {blancPay === "cancel" ? (
        <p className="rounded-xl border border-[var(--studelio-border)] bg-card px-4 py-3 text-sm text-[var(--studelio-text-body)]">
          Paiement annulé. Tu peux réessayer quand tu veux.
        </p>
      ) : null}

      <header className="rounded-[20px] border border-[var(--studelio-border)] bg-gradient-to-br from-[var(--studelio-bg-soft)] to-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">{pageTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">
          {kind === "BREVET_BLANC" ? (
            <>
              Inscris-toi aux créneaux <strong className="font-medium text-[var(--studelio-text)]">brevet blanc</strong>{" "}
              proposés. Après inscription : visio, sujet, envoi de copie et suivi de la correction.
            </>
          ) : (
            <>
              Inscris-toi aux créneaux <strong className="font-medium text-[var(--studelio-text)]">bac blanc</strong>.
              Tu accèdes à la visio et au sujet une fois inscrit·e, puis tu déposes le lien de ta copie.
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Public affiché : {blancKindLabel[kind]}</p>
      </header>

      {!blancIncludedInPlan ? (
        <BlancUpsellPanel
          stripeConfigured={stripeConfigured}
          planName={planLabel[plan]}
          creditsAvailable={creditsAvailable}
        />
      ) : null}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Mes inscriptions</h2>
        {myEnrollments.length === 0 ? (
          <p className="rounded-[20px] border border-dashed border-[var(--studelio-border)] bg-card/50 p-6 text-sm text-[var(--studelio-text-body)]">
            Tu n’es inscrit·e à aucun créneau pour l’instant.
            {canEnrollNewSlot ?
              " Parcours la liste ci-dessous et clique sur « M’inscrire »."
            : " Achète une place ou passe à l’offre Excellence pour t’inscrire."}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {myEnrollments.map((row) => {
              const s = row.slot;
              return (
                <li
                  key={row.id}
                  className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-5 shadow-[var(--studelio-shadow)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-[var(--studelio-text)]">{s.title}</h3>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {bacBlancStatusLabel[row.status]}
                    </span>
                  </div>
                  {row.proCorrectionPurchased ? (
                    <p className="mt-2 text-xs font-medium text-[var(--studelio-blue)]">
                      Option payée : correction par un enseignant
                    </p>
                  ) : null}
                  {s.description ? (
                    <p className="mt-2 text-sm text-[var(--studelio-text-body)]">{s.description}</p>
                  ) : null}

                  {s.sujetUrl ? (
                    <a
                      href={s.sujetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "mt-3 inline-flex rounded-full",
                      )}
                    >
                      Voir le sujet
                    </a>
                  ) : null}

                  {s.visioAt || s.visioUrl || s.visioLabel ? (
                    <div className="mt-4 rounded-xl border border-[var(--studelio-blue)]/25 bg-[var(--studelio-blue-dim)]/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studelio-blue)]">
                        Visioconférence
                      </p>
                      {s.visioAt ? (
                        <p className="mt-1 text-sm font-medium text-[var(--studelio-text)]">
                          {formatVisioDateTime(s.visioAt)}
                        </p>
                      ) : null}
                      {s.visioLabel ? (
                        <p className="mt-1 text-xs text-[var(--studelio-text-body)]">{s.visioLabel}</p>
                      ) : null}
                      {s.visioUrl ? (
                        <a
                          href={s.visioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex rounded-full")}
                        >
                          Rejoindre la visio
                        </a>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">Lien à venir — l’équipe le complètera bientôt.</p>
                      )}
                    </div>
                  ) : null}

                  {row.status === "PENDING" ? (
                    <BlancCopieForm enrollmentId={row.id} defaultUrl={row.copieUrl ?? ""} />
                  ) : row.copieUrl ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Copie envoyée :{" "}
                      <a href={row.copieUrl} className="text-[var(--studelio-blue)] underline" target="_blank" rel="noreferrer">
                        ouvrir le lien
                      </a>
                    </p>
                  ) : null}

                  {row.noteFinale != null ? (
                    <p className="mt-3 font-display text-lg font-semibold text-[var(--studelio-blue)]">
                      Note : {row.noteFinale.toFixed(1)} / 20
                    </p>
                  ) : null}
                  {row.commentaire ? (
                    <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs leading-relaxed text-[var(--studelio-text-body)]">
                      <span className="font-medium text-[var(--studelio-text)]">Commentaire · </span>
                      {row.commentaire.length > 400 ? `${row.commentaire.slice(0, 400)}…` : row.commentaire}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <BlancUnenrollButton slotId={s.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Créneaux disponibles</h2>
        {!canEnrollNewSlot ? (
          <p className="rounded-[20px] border border-[var(--studelio-border)] bg-card/50 p-6 text-sm text-[var(--studelio-text-body)]">
            Avec ton offre <span className="font-medium">{planLabel[plan]}</span>, les inscriptions aux examens blancs
            passent par un achat à l’unité (15 ou 20&nbsp;€) ou par l’offre Excellence — vois le bloc ci-dessus.
          </p>
        ) : openToJoin.length === 0 ? (
          <p className="rounded-[20px] border border-[var(--studelio-border)] bg-card/50 p-6 text-sm text-[var(--studelio-text-body)]">
            Aucun autre créneau ouvert pour le moment. Reviens plus tard ou contacte l’équipe Studelio.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {openToJoin.map((s) => {
              const full = s.capacity != null && s._count.enrollments >= s.capacity;
              return (
                <li
                  key={s.id}
                  className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-5 shadow-[var(--studelio-shadow)]"
                >
                  <h3 className="font-display text-lg font-semibold text-[var(--studelio-text)]">{s.title}</h3>
                  {s.description ? (
                    <p className="mt-2 text-sm text-[var(--studelio-text-body)]">{s.description}</p>
                  ) : null}
                  <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {s.visioAt ? (
                      <div>
                        <dt className="inline font-medium text-[var(--studelio-text)]">Créneau : </dt>
                        <dd className="inline">{formatVisioDateTime(s.visioAt)}</dd>
                      </div>
                    ) : null}
                    {s.capacity != null ? (
                      <div>
                        Places : {Math.max(0, s.capacity - s._count.enrollments)} / {s.capacity}
                      </div>
                    ) : null}
                    {s.closesAt ? (
                      <div>Inscriptions jusqu’au {formatVisioDateTime(s.closesAt)}</div>
                    ) : null}
                  </dl>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Après inscription : visio, sujet et dépôt de copie.
                  </p>
                  <div className="mt-4">
                    {full ? (
                      <span className="text-sm text-muted-foreground">Complet</span>
                    ) : (
                      <BlancEnrollButton slotId={s.id} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link
        href="/app/dashboard"
        className={cn(buttonVariants({ variant: "outline" }), "inline-flex rounded-full")}
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
