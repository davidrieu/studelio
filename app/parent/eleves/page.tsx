import { auth } from "@/auth";
import { ChildProgressCard } from "@/components/parent/child-progress-card";
import { ParentPageHero } from "@/components/parent/parent-page-hero";
import { getParentChildrenRows } from "@/lib/parent-dashboard-data";
import { cn } from "@/lib/utils";

export default async function ParentElevesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const rows = userId ? await getParentChildrenRows(userId) : [];

  return (
    <div className="space-y-10 pb-4">
      <ParentPageHero
        title="Élèves"
        description="Détail des comptes reliés : progression, temps passé et usage d’André."
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
          <p className="relative text-muted-foreground">
            Aucun élève relié. L’élève doit t’associer depuis son tableau de bord (section parent / tuteur) après
            l’onboarding.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => (
            <ChildProgressCard key={row.profileId} row={row} variant="full" />
          ))}
        </div>
      )}
    </div>
  );
}
