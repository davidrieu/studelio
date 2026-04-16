import type { Niveau } from "@prisma/client";
import { niveauLabel } from "@/lib/labels";
import type { ParentChildRow } from "@/lib/parent-dashboard-data";

function formatLastSession(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

type Props = { row: ParentChildRow; variant?: "compact" | "full" };

export function ChildProgressCard({ row, variant = "compact" }: Props) {
  const niveau = niveauLabel[row.niveau as Niveau] ?? row.niveau;
  const displayName = row.name?.trim() || row.email;
  const chapterLine =
    row.chaptersTotal > 0
      ? `${row.chaptersCompleted} / ${row.chaptersTotal} modules complétés`
      : "Programme non encore associé";

  return (
    <article
      id={`child-${row.userId}`}
      className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--studelio-border)] pb-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">{displayName}</h2>
          <p className="text-sm text-muted-foreground">
            {niveau}
            {row.programmeTitle ? ` · ${row.programmeTitle}` : null}
          </p>
        </div>
        <span
          className={
            row.onboardingDone
              ? "rounded-full bg-[var(--studelio-green-dim)]/50 px-2.5 py-0.5 text-xs font-medium text-[var(--studelio-text)]"
              : "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-200"
          }
        >
          {row.onboardingDone ? "Parcours démarré" : "Onboarding en cours"}
        </span>
      </header>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Progression</dt>
          <dd className="font-medium">{chapterLine}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Série (jours)</dt>
          <dd className="font-medium">{row.streakDays}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Temps d’étude</dt>
          <dd className="font-medium">{row.totalMinutes} min</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dernière activité</dt>
          <dd className="font-medium">{formatLastSession(row.lastSessionAt)}</dd>
        </div>
        {variant === "full" ? (
          <>
            <div>
              <dt className="text-muted-foreground">Sessions avec André</dt>
              <dd className="font-medium">{row.chatSessions}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inscriptions épreuves blanches</dt>
              <dd className="font-medium">{row.blancEnrollments}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Email du compte élève</dt>
              <dd className="font-mono text-xs text-muted-foreground">{row.email}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </article>
  );
}
