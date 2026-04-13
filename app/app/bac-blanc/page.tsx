import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BlancEnrollButton, BlancUnenrollButton } from "@/components/blanc-slot-actions";
import { buttonVariants } from "@/components/ui/button";
import { blancKindForNiveau, blancKindLabel, epreuveBlancheShortLabel } from "@/lib/blanc-kind";
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

export default async function EpreuvesBlanchesPage() {
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

  const kind = blancKindForNiveau(profile.niveau);
  const pageTitle = epreuveBlancheShortLabel(profile.niveau);
  const now = new Date();

  const slots = await prisma.blancSlot.findMany({
    where: {
      published: true,
      kind,
      OR: [{ closesAt: null }, { closesAt: { gt: now } }],
    },
    orderBy: [{ visioAt: "asc" }, { createdAt: "asc" }],
    include: {
      enrollments: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      _count: { select: { enrollments: true } },
    },
  });

  const myEnrolled = slots.filter((s) => s.enrollments.length > 0);
  const openToJoin = slots.filter((s) => s.enrollments.length === 0);

  return (
    <div className="space-y-8">
      <header className="rounded-[20px] border border-[var(--studelio-border)] bg-gradient-to-br from-[var(--studelio-bg-soft)] to-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">{pageTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">
          {kind === "BREVET_BLANC" ? (
            <>
              Pour le collège (6e à 3e), inscris-toi aux{" "}
              <strong className="font-medium text-[var(--studelio-text)]">créneaux brevet blanc</strong> proposés par
              l’équipe. Une fois inscrit·e, tu vois le lien de la visio.
            </>
          ) : (
            <>
              Pour le lycée et le BTS, inscris-toi aux{" "}
              <strong className="font-medium text-[var(--studelio-text)]">créneaux bac blanc</strong>. Le lien visio
              s’affiche après inscription.
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Public affiché : {blancKindLabel[kind]}</p>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Mes inscriptions</h2>
        {myEnrolled.length === 0 ? (
          <p className="rounded-[20px] border border-dashed border-[var(--studelio-border)] bg-card/50 p-6 text-sm text-[var(--studelio-text-body)]">
            Tu n’es inscrit·e à aucun créneau pour l’instant. Parcours la liste ci-dessous et clique sur « M’inscrire ».
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {myEnrolled.map((s) => (
              <li
                key={s.id}
                className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-5 shadow-[var(--studelio-shadow)]"
              >
                <h3 className="font-display text-lg font-semibold text-[var(--studelio-text)]">{s.title}</h3>
                {s.description ? (
                  <p className="mt-2 text-sm text-[var(--studelio-text-body)]">{s.description}</p>
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

                <div className="mt-4">
                  <BlancUnenrollButton slotId={s.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Créneaux disponibles</h2>
        {openToJoin.length === 0 ? (
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
                    Inscris-toi pour recevoir le <strong className="font-medium text-foreground">lien visio</strong>.
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
