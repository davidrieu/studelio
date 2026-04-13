import Link from "next/link";
import { auth } from "@/auth";
import { ChildProgressCard } from "@/components/parent/child-progress-card";
import { getParentChildrenRows } from "@/lib/parent-dashboard-data";

export default async function ParentElevesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const rows = userId ? await getParentChildrenRows(userId) : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Élèves</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Détail des comptes reliés : progression, temps passé et usage d’André.
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
          <p className="text-muted-foreground">Aucun élève relié. L’inscription élève doit inclure ton email parent.</p>
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
