import Link from "next/link";
import { auth } from "@/auth";
import { getParentChildrenRows } from "@/lib/parent-dashboard-data";

export default async function ParentRapportsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const rows = userId ? await getParentChildrenRows(userId) : [];

  const totalMinutes = rows.reduce((a, r) => a + r.totalMinutes, 0);
  const totalChat = rows.reduce((a, r) => a + r.chatSessions, 0);
  const totalBlanc = rows.reduce((a, r) => a + r.blancEnrollments, 0);
  const maxStreak = rows.length ? Math.max(...rows.map((r) => r.streakDays)) : 0;
  const progressionMoyenne =
    rows.length > 0 ? Math.round(rows.reduce((a, r) => a + r.progressPercent, 0) / rows.length) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Rapports</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Synthèse agrégée sur tous les élèves reliés à ton compte.
          </p>
        </div>
        <Link
          href="/parent/dashboard"
          className="text-sm font-medium text-[var(--studelio-blue)] underline-offset-4 hover:underline"
        >
          ← Tableau de bord
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[var(--studelio-border)] bg-card/60 p-8 text-center">
          <p className="text-muted-foreground">Pas encore de données : relie au moins un compte élève.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
            <p className="text-sm text-muted-foreground">Élèves suivis</p>
            <p className="mt-1 font-display text-3xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:col-span-2 lg:col-span-1">
            <p className="text-sm text-muted-foreground">Progression moyenne (tous élèves)</p>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/70 dark:bg-muted/40"
                role="progressbar"
                aria-valuenow={progressionMoyenne}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[var(--studelio-blue)]"
                  style={{ width: `${progressionMoyenne}%` }}
                />
              </div>
              <span className="shrink-0 font-display text-2xl font-semibold tabular-nums text-[var(--studelio-text)]">
                {progressionMoyenne} %
              </span>
            </div>
          </div>
          <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
            <p className="text-sm text-muted-foreground">Temps d’étude cumulé</p>
            <p className="mt-1 font-display text-3xl font-semibold">{totalMinutes} min</p>
          </div>
          <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
            <p className="text-sm text-muted-foreground">Meilleure série (jours)</p>
            <p className="mt-1 font-display text-3xl font-semibold">{maxStreak}</p>
          </div>
          <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
            <p className="text-sm text-muted-foreground">Sessions André (total)</p>
            <p className="mt-1 font-display text-3xl font-semibold">{totalChat}</p>
          </div>
          <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
            <p className="text-sm text-muted-foreground">Inscriptions épreuves blanches</p>
            <p className="mt-1 font-display text-3xl font-semibold">{totalBlanc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
