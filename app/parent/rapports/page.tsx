import { auth } from "@/auth";
import { ParentPageHero } from "@/components/parent/parent-page-hero";
import { ParentStatTile } from "@/components/parent/parent-stat-tile";
import { getParentChildrenRows } from "@/lib/parent-dashboard-data";
import { cn } from "@/lib/utils";

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
    <div className="space-y-10 pb-4">
      <ParentPageHero
        title="Rapports"
        description="Synthèse agrégée sur tous les élèves reliés à ton compte."
        backHref="/parent/dashboard"
        backLabel="← Tableau de bord"
      />

      {rows.length === 0 ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-[24px] border border-dashed border-[var(--studelio-border)]",
            "bg-gradient-to-b from-card/90 to-[var(--studelio-bg-soft)]/40 p-8 text-center shadow-[var(--studelio-shadow)]",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--studelio-blue)_0%,transparent_55%)] opacity-[0.06]"
            aria-hidden
          />
          <p className="relative text-muted-foreground">Pas encore de données : relie au moins un compte élève.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ParentStatTile label="Élèves suivis">
            <p className="font-display text-3xl font-semibold text-[var(--studelio-text)]">{rows.length}</p>
          </ParentStatTile>
          <ParentStatTile label="Progression moyenne (tous élèves)" className="sm:col-span-2 lg:col-span-1">
            <div className="mt-1 flex items-center gap-3">
              <div
                className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/70 dark:bg-muted/40"
                role="progressbar"
                aria-valuenow={progressionMoyenne}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--studelio-blue)] to-[#2451b0] dark:to-[#3d6fd4]"
                  style={{ width: `${progressionMoyenne}%` }}
                />
              </div>
              <span className="shrink-0 font-display text-2xl font-semibold tabular-nums text-[var(--studelio-text)]">
                {progressionMoyenne} %
              </span>
            </div>
          </ParentStatTile>
          <ParentStatTile label="Temps d’étude cumulé">
            <p className="font-display text-3xl font-semibold text-[var(--studelio-text)]">{totalMinutes} min</p>
          </ParentStatTile>
          <ParentStatTile label="Meilleure série (jours)">
            <p className="font-display text-3xl font-semibold text-[var(--studelio-text)]">{maxStreak}</p>
          </ParentStatTile>
          <ParentStatTile label="Sessions André (total)">
            <p className="font-display text-3xl font-semibold text-[var(--studelio-text)]">{totalChat}</p>
          </ParentStatTile>
          <ParentStatTile label="Inscriptions épreuves blanches">
            <p className="font-display text-3xl font-semibold text-[var(--studelio-text)]">{totalBlanc}</p>
          </ParentStatTile>
        </div>
      )}
    </div>
  );
}
