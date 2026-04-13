import Link from "next/link";
import { auth } from "@/auth";
import { ChildProgressCard } from "@/components/parent/child-progress-card";
import { getParentChildrenRows } from "@/lib/parent-dashboard-data";

export default async function ParentDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const rows = userId ? await getParentChildrenRows(userId) : [];

  return (
    <div className="space-y-8">
      <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-8 shadow-[var(--studelio-shadow)]">
        <h1 className="font-display text-2xl font-semibold">Tableau de bord</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Vue d’ensemble de la progression des comptes élèves reliés au tien. Les statistiques se mettent à jour lorsque
          l’élève étudie sur Studelio.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[var(--studelio-border)] bg-card/60 p-8 text-center">
          <p className="font-medium text-[var(--studelio-text)]">Aucun élève relié pour l’instant</p>
          <p className="mt-2 text-sm text-muted-foreground">
            L’élève peut relier ton compte depuis son tableau de bord Studelio après l’onboarding, avec ton email et un mot
            de passe que vous choisissez ensemble. Aucun email automatique n’est envoyé depuis Studelio.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Progression par élève</h2>
            <Link
              href="/parent/eleves"
              className="text-sm font-medium text-[var(--studelio-blue)] underline-offset-4 hover:underline"
            >
              Voir le détail
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((row) => (
              <ChildProgressCard key={row.profileId} row={row} variant="compact" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
