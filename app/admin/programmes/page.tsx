import Link from "next/link";
import { auth } from "@/auth";
import { niveauLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminProgrammesPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const programmes = await prisma.programme.findMany({
    orderBy: { niveau: "asc" },
    select: {
      id: true,
      niveau: true,
      title: true,
      _count: { select: { chapters: true, dictations: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Programmes par niveau</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Les modules viennent surtout du seed. Les <strong>dictées</strong> (audio + corrigé) se gèrent ici par programme.
        </p>
      </div>

      <ul className="space-y-3">
        {programmes.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[var(--studelio-border)] bg-card px-4 py-3"
          >
            <div>
              <p className="font-medium text-[var(--studelio-text)]">
                {niveauLabel[p.niveau]} — {p.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {p._count.chapters} module(s) · {p._count.dictations} dictée(s)
              </p>
            </div>
            {isAdmin ? (
              <Link
                href={`/admin/programmes/${p.id}/dictations`}
                className={cn(buttonVariants({ variant: "outline" }), "rounded-full text-sm")}
              >
                Dictées
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">Réservé aux administrateurs</span>
            )}
          </li>
        ))}
      </ul>

      {programmes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun programme en base — lance le seed Prisma.</p>
      ) : null}
    </div>
  );
}
