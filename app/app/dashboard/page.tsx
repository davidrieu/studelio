import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { niveauLabel, planLabel, subStatusLabel } from "@/lib/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: { include: { programme: true } },
      subscription: true,
      _count: { select: { chatSessions: true, bacBlancs: true } },
    },
  });

  if (!user?.studentProfile) {
    redirect("/onboarding");
  }

  const name = user.name?.split(/\s+/)[0] ?? "toi";
  const sp = user.studentProfile;
  const prog = sp.programme;
  const sub = user.subscription;

  const pendingBac = await prisma.bacBlanc.count({
    where: {
      userId: user.id,
      status: { in: ["PENDING", "SUBMITTED", "IN_REVIEW"] },
    },
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[20px] border border-[var(--studelio-border)] bg-gradient-to-br from-[var(--studelio-bg-soft)] to-[var(--studelio-bg-muted)] p-8 shadow-[var(--studelio-shadow)]">
        <p className="font-display text-2xl font-semibold text-[var(--studelio-text)]">
          Bonjour, {name} 👋
        </p>
        <p className="mt-2 max-w-xl text-[var(--studelio-text-body)]">
          Niveau <span className="font-medium text-[var(--studelio-text)]">{niveauLabel[sp.niveau]}</span>
          {prog ? (
            <>
              {" "}
              · Programme <span className="font-medium text-[var(--studelio-text)]">{prog.title}</span>
            </>
          ) : null}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Série (jours)" value={String(sp.streakDays)} hint="À venir : mise à jour auto avec tes sessions" />
        <StatCard label="Temps sur Studelio" value={formatMinutes(sp.totalMinutes)} />
        <StatCard label="Discussions avec André" value={String(user._count.chatSessions)} />
        <StatCard label="Bacs blancs suivis" value={String(user._count.bacBlancs)} hint={pendingBac ? `${pendingBac} en cours` : undefined} />
      </div>

      <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Abonnement</h2>
        {sub ? (
          <dl className="mt-4 grid gap-2 text-sm text-[var(--studelio-text-body)] sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium text-[var(--studelio-text)]">{planLabel[sub.plan]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Statut</dt>
              <dd className="font-medium text-[var(--studelio-text)]">{subStatusLabel[sub.status]}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Aucune donnée d’abonnement.</p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Le paiement Stripe et le passage en statut « Actif » arrivent à l’étape suivante du produit.
        </p>
        <Link
          href="/onboarding/plan"
          className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex rounded-full")}
        >
          Voir les plans
        </Link>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/app/andre" className={cn(buttonVariants(), "rounded-full")}>
          Parler à André
        </Link>
        <Link href="/app/programme" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          Mon programme
        </Link>
        <Link href="/app/bac-blanc" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          Bacs blancs
        </Link>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[16px] border border-[var(--studelio-border)] bg-card p-4 shadow-[var(--studelio-shadow)]">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-[var(--studelio-text)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
