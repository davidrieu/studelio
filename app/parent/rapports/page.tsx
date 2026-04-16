import Link from "next/link";
import { auth } from "@/auth";
import { getParentChildrenRows } from "@/lib/parent-dashboard-data";

export default async function ParentRapportsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const rows = userId ? await getParentChildrenRows(userId) : [];

  const totalMinutes = rows.reduce((a, r) => a + r.totalMinutes, 0);
  const totalChaptersDone = rows.reduce((a, r) => a + r.chaptersCompleted, 0);
  const totalChapters = rows.reduce((a, r) => a + r.chaptersTotal, 0);
  const totalChat = rows.reduce((a, r) => a + r.chatSessions, 0);
  const totalBlanc = rows.reduce((a, r) => a + r.blancEnrollments, 0);
  const maxStreak = rows.length ? Math.max(...rows.map((r) => r.streakDays)) : 0;
  const radarVals = rows.map((r) => r.radarMoyenne).filter((x): x is number => x !== null);
  const radarFamille =
    radarVals.length > 0 ? Math.round((radarVals.reduce((a, b) => a + b, 0) / radarVals.length) * 10) / 10 : null;

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
          <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
            <p className="text-sm text-muted-foreground">Moyenne radar (tous élèves)</p>
            <p className="mt-1 font-display text-3xl font-semibold">
              {radarFamille !== null ? (
                <>
                  <span className="tabular-nums">{Number.isInteger(radarFamille) ? radarFamille : radarFamille.toFixed(1)}</span>
                  <span className="text-lg font-normal text-muted-foreground"> %</span>
                </>
              ) : (
                <span className="text-2xl text-muted-foreground">—</span>
              )}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Moyenne des six compétences (0–100) sur les élèves qui ont déjà un radar en base. Complété par les séances
              programme, pas seulement par les modules « terminés ».
            </p>
            {totalChapters > 0 ? (
              <p className="mt-3 border-t border-[var(--studelio-border)]/60 pt-3 text-xs text-muted-foreground">
                Modules marqués terminés (tous élèves) :{" "}
                <span className="font-medium text-[var(--studelio-text)]">
                  {totalChaptersDone} / {totalChapters}
                </span>
              </p>
            ) : null}
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
