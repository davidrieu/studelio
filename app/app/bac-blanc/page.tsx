import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { bacBlancStatusLabel, niveauLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

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

const statusStyle: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-[var(--studelio-blue-dim)] text-[var(--studelio-text)]",
  IN_REVIEW: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  CORRECTED: "bg-[var(--studelio-green-dim)] text-[var(--studelio-green)]",
};

export default async function BacBlancListPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const rows = await prisma.bacBlanc.findMany({
    where: { userId: session.user.id },
    orderBy: [{ trimestre: "asc" }, { sessionNumber: "asc" }],
  });

  return (
    <div className="space-y-6">
      <header className="rounded-[20px] border border-[var(--studelio-border)] bg-gradient-to-br from-[var(--studelio-bg-soft)] to-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">Bacs blancs</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">
          Les épreuves blanches se déroulent en <strong className="font-medium text-[var(--studelio-text)]">visio</strong>{" "}
          : date, lien et consignes apparaissent ci-dessous. Après la séance, tu pourras suivre l’envoi de copie, la
          correction et la note.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[var(--studelio-border)] bg-card/50 p-10 text-center shadow-[var(--studelio-shadow)]">
          <p className="text-sm text-[var(--studelio-text-body)]">
            Aucun bac blanc n’est encore associé à ton compte. Quand une session sera ouverte, elle apparaîtra dans cette
            liste avec le sujet et les dates.
          </p>
          <Link
            href="/app/dashboard"
            className={cn(buttonVariants({ variant: "outline" }), "mt-6 inline-flex rounded-full")}
          >
            Retour au tableau de bord
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((b) => (
            <li
              key={b.id}
              className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-5 shadow-[var(--studelio-shadow)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    T{b.trimestre} · Session {b.sessionNumber}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-[var(--studelio-text)]">{b.subject}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Niveau {niveauLabel[b.niveau]}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusStyle[b.status] ?? "bg-muted",
                  )}
                >
                  {bacBlancStatusLabel[b.status]}
                </span>
              </div>

              {b.visioAt || b.visioUrl || b.visioLabel ? (
                <div className="mt-4 rounded-xl border border-[var(--studelio-blue)]/25 bg-[var(--studelio-blue-dim)]/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studelio-blue)]">
                    Visioconférence
                  </p>
                  {b.visioAt ? (
                    <p className="mt-1 text-sm font-medium text-[var(--studelio-text)]">{formatVisioDateTime(b.visioAt)}</p>
                  ) : null}
                  {b.visioLabel ? (
                    <p className="mt-1 text-xs text-[var(--studelio-text-body)]">{b.visioLabel}</p>
                  ) : null}
                  {b.visioUrl ? (
                    <a
                      href={b.visioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "mt-3 inline-flex rounded-full",
                      )}
                    >
                      Rejoindre la visio
                    </a>
                  ) : null}
                </div>
              ) : null}

              <dl className="mt-4 grid gap-2 border-t border-[var(--studelio-border)]/60 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Envoi copie</dt>
                  <dd className="text-right font-medium text-[var(--studelio-text)]">{formatDate(b.submittedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Correction</dt>
                  <dd className="text-right font-medium text-[var(--studelio-text)]">{formatDate(b.correctedAt)}</dd>
                </div>
                {b.noteFinale != null ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Note</dt>
                    <dd className="text-right font-display text-lg font-semibold text-[var(--studelio-blue)]">
                      {b.noteFinale.toFixed(1)} / 20
                    </dd>
                  </div>
                ) : null}
              </dl>

              {b.sujetUrl ? (
                <a
                  href={b.sujetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-4 w-full rounded-full sm:w-auto",
                  )}
                >
                  Voir le sujet
                </a>
              ) : null}

              {b.status === "CORRECTED" && b.commentaire ? (
                <p className="mt-3 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-[var(--studelio-text-body)]">
                  <span className="font-medium text-[var(--studelio-text)]">Commentaire · </span>
                  {b.commentaire.length > 280 ? `${b.commentaire.slice(0, 280)}…` : b.commentaire}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
