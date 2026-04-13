import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { blancKindLabel } from "@/lib/blanc-kind";
import { roleLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

function formatShortDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "CORRECTOR") {
    redirect("/auth/login?error=role");
  }

  const [
    usersByRole,
    totalUsers,
    slotsTotal,
    slotsPublished,
    enrollmentsTotal,
    enrollmentsPendingCopie,
    chatSessionsTotal,
    recentEnrollments,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.blancSlot.count(),
    prisma.blancSlot.count({ where: { published: true } }),
    prisma.blancEnrollment.count(),
    prisma.blancEnrollment.count({ where: { status: "PENDING" } }),
    prisma.chatSession.count(),
    prisma.blancEnrollment.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        slot: { select: { title: true, kind: true } },
      },
    }),
  ]);

  const roleCounts = Object.fromEntries(usersByRole.map((g) => [g.role, g._count._all])) as Partial<
    Record<keyof typeof roleLabel, number>
  >;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Vue d’ensemble</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Indicateurs Studelio — comptes, épreuves blanches et activité récente.
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Utilisateurs</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total comptes" value={String(totalUsers)} />
          {(Object.keys(roleLabel) as (keyof typeof roleLabel)[]).map((r) => (
            <StatCard key={r} label={roleLabel[r]} value={String(roleCounts[r] ?? 0)} />
          ))}
        </div>
        {session.user.role === "ADMIN" ? (
          <Link
            href="/admin/utilisateurs"
            className="mt-3 inline-block text-sm text-[var(--studelio-blue)] underline"
          >
            Gérer la liste des utilisateurs →
          </Link>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Épreuves blanches</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Créneaux (total)" value={String(slotsTotal)} />
          <StatCard label="Créneaux publiés" value={String(slotsPublished)} />
          <StatCard label="Inscriptions" value={String(enrollmentsTotal)} />
          <StatCard
            label="En attente de copie"
            value={String(enrollmentsPendingCopie)}
            hint="Élèves inscrits sans lien de copie"
          />
        </div>
        <Link
          href="/admin/bacs-blancs"
          className="mt-3 inline-block text-sm text-[var(--studelio-blue)] underline"
        >
          Créneaux et suivi des copies →
        </Link>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">André</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Sessions de chat" value={String(chatSessionsTotal)} />
        </div>
      </section>

      <section className="rounded-[12px] border border-[var(--studelio-border)] bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Dernières inscriptions (épreuves blanches)</h2>
        {recentEnrollments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucune inscription pour l’instant.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--studelio-border)]/60 text-sm">
            {recentEnrollments.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0">
                <div>
                  <p className="font-medium text-foreground">{e.slot.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.user.email}
                    {e.user.name ? ` · ${e.user.name}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <span>{blancKindLabel[e.slot.kind]}</span>
                  <span className="mx-1">·</span>
                  <span>{formatShortDate(e.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)]/40 p-4 shadow-[var(--studelio-shadow)]">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-[var(--studelio-text)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
