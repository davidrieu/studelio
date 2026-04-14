import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { epreuveBlancheShortLabel } from "@/lib/blanc-kind";
import { niveauLabel, planLabel, subStatusLabel } from "@/lib/labels";
import { AddParentTutorForm } from "@/components/add-parent-tutor-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const checkoutOk = searchParams?.checkout === "success";
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: {
        include: {
          programme: true,
          parent: { include: { user: { select: { email: true } } } },
        },
      },
      subscription: true,
      _count: { select: { chatSessions: true, blancEnrollments: true } },
    },
  });

  if (!user?.studentProfile) {
    redirect("/onboarding");
  }

  const name = user.name?.split(/\s+/)[0] ?? "toi";
  const sp = user.studentProfile;
  const prog = sp.programme;
  const sub = user.subscription;

  const epreuveLinkLabel = epreuveBlancheShortLabel(sp.niveau);

  return (
    <div className="space-y-8">
      {checkoutOk ? (
        <p
          className="rounded-[16px] border border-[var(--studelio-green-dim)] bg-[var(--studelio-green-dim)] px-4 py-3 text-sm text-[var(--studelio-text)]"
          role="status"
        >
          Merci ! Paiement reçu. Ton abonnement apparaît ci-dessous dès que Stripe nous confirme le webhook (quelques
          secondes). Actualise la page si le statut reste « À finaliser ».
        </p>
      ) : null}
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
        {sp.lastSessionAt ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Dernière activité :{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(sp.lastSessionAt)}
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Série (jours)"
          value={String(sp.streakDays)}
          hint="Jours consécutifs avec au moins une activité (Paris), mis à jour après André ou ta progression programme"
        />
        <StatCard label="Temps sur Studelio" value={formatMinutes(sp.totalMinutes)} />
        <StatCard label="Discussions avec André" value={String(user._count.chatSessions)} />
        <StatCard
          label={`Inscriptions ${epreuveLinkLabel.toLowerCase()}`}
          value={String(user._count.blancEnrollments)}
          hint="Créneaux auxquels tu es inscrit·e"
        />
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
          Les offres incluent 3 jours d’essai. Après paiement, le statut se met à jour en quelques secondes grâce à
          Stripe (actualise si besoin).
        </p>
        <Link
          href="/onboarding/plan"
          className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex rounded-full")}
        >
          Voir les plans
        </Link>
      </section>

      <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Parent ou tuteur</h2>
        {sp.parent?.user?.email ? (
          <p className="mt-3 text-sm text-[var(--studelio-text-body)]">
            Compte relié :{" "}
            <span className="font-medium text-[var(--studelio-text)]">{sp.parent.user.email}</span>. Le parent peut se
            connecter sur Studelio avec cette adresse et le mot de passe que tu as défini. Tu peux remplacer la liaison
            ci-dessous (le compte parent existant reste inchangé si l’email existe déjà).
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Ajoute l’email et le mot de passe du compte parent ou tuteur. Aucun email automatique n’est envoyé : transmets
            les identifiants au parent toi-même.
          </p>
        )}
        <div className="mt-6">
          <AddParentTutorForm />
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/app/andre" className={cn(buttonVariants(), "rounded-full")}>
          Parler à André
        </Link>
        <Link href="/app/programme/seance" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          Ma séance programme
        </Link>
        <Link href="/app/bac-blanc" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          {epreuveLinkLabel}
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
