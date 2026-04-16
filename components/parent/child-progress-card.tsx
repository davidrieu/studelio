import type { Niveau } from "@prisma/client";
import { niveauLabel } from "@/lib/labels";
import type { ParentChildRow } from "@/lib/parent-dashboard-data";

function formatLastSession(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function formatRadarMoyenne(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

type Props = { row: ParentChildRow; variant?: "compact" | "full" };

export function ChildProgressCard({ row, variant = "compact" }: Props) {
  const niveau = niveauLabel[row.niveau as Niveau] ?? row.niveau;
  const displayName = row.name?.trim() || row.email;

  const moduleFootnote =
    row.chaptersTotal > 0
      ? `${row.chaptersCompleted} module${row.chaptersCompleted > 1 ? "s" : ""} marqué(s) « terminé » sur ${row.chaptersTotal} au parcours (ça avance aussi sans tout cocher).`
      : "Parcours Studelio : programme pas encore relié ou en cours de configuration.";

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
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Activité sur le programme</dt>
          <dd className="mt-1 space-y-2 font-medium leading-snug text-[var(--studelio-text-body)]">
            {row.radarMoyenne !== null ? (
              <p>
                <span className="text-[var(--studelio-text)]">Radar des compétences</span> (moyenne des six axes,
                0–100) : environ <span className="tabular-nums text-[var(--studelio-blue)]">{formatRadarMoyenne(row.radarMoyenne)} %</span> — ce chiffre monte au fil des séances avec André, même sans finir tous les modules.
              </p>
            ) : (
              <p>
                Le radar des compétences apparaîtra dès que l’élève aura un peu travaillé en{" "}
                <span className="text-[var(--studelio-text)]">séance programme</span> avec André.
              </p>
            )}
            {row.lastProgrammeSeancePreview ? (
              <div className="rounded-xl border border-[var(--studelio-border)]/80 bg-[var(--studelio-bg-soft)]/50 px-3 py-2.5 text-sm font-normal text-[var(--studelio-text-body)]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Dernier message d’André (séance programme)
                  {row.lastProgrammeSeanceAt ? (
                    <span className="ml-1 font-normal normal-case text-muted-foreground">
                      · {formatLastSession(row.lastProgrammeSeanceAt)}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1.5 text-[var(--studelio-text)]">« {row.lastProgrammeSeancePreview} »</p>
              </div>
            ) : row.onboardingDone ? (
              <p className="text-sm font-normal text-muted-foreground">
                Pas encore d’échange enregistré en séance programme — dès la prochaine séance, un extrait s’affichera ici.
              </p>
            ) : null}
            <p className="text-xs font-normal leading-relaxed text-muted-foreground">{moduleFootnote}</p>
          </dd>
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
