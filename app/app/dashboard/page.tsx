import { auth } from "@/auth";

export default async function StudentDashboardPage() {
  const session = await auth();
  const name = session?.user?.name?.split(/\s+/)[0] ?? "toi";

  return (
    <div className="space-y-8">
      <section className="rounded-[20px] border border-[var(--studelio-border)] bg-gradient-to-br from-[var(--studelio-bg-soft)] to-[var(--studelio-bg-muted)] p-8 shadow-[var(--studelio-shadow)]">
        <p className="font-display text-2xl font-semibold text-[var(--studelio-text)]">
          Bonjour, {name} 👋
        </p>
        <p className="mt-2 max-w-xl text-[var(--studelio-text-body)]">
          Ton tableau de bord affichera bientôt ta série, ton temps de travail, tes compétences et ta prochaine session bac
          blanc.
        </p>
      </section>
    </div>
  );
}
