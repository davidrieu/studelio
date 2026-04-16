import Link from "next/link";
import { auth } from "@/auth";
import { ChildProgressCard } from "@/components/parent/child-progress-card";
import { ParentPageHero } from "@/components/parent/parent-page-hero";
import { getParentChildrenRows } from "@/lib/parent-dashboard-data";
import { cn } from "@/lib/utils";

export default async function ParentDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const rows = userId ? await getParentChildrenRows(userId) : [];

  return (
    <div className="space-y-10 pb-4">
      <ParentPageHero
        title="Tableau de bord"
        description="Vue d’ensemble des comptes élèves reliés. La barre de progression se met à jour quand l’élève utilise Studelio."
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
          <div className="relative">
            <p className="font-medium text-[var(--studelio-text)]">Aucun élève relié pour l’instant</p>
            <p className="mt-2 text-sm text-muted-foreground">
              L’élève peut relier ton compte depuis son tableau de bord Studelio après l’onboarding, avec ton email et un
              mot de passe que vous choisissez ensemble. Aucun email automatique n’est envoyé depuis Studelio.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Suivi par élève</h2>
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
