import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await auth();

  return (
    <div className="min-h-screen bg-[var(--studelio-bg)]">
      <div className="studelio-grain pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      <header className="sticky top-0 z-10 border-b border-[var(--studelio-border)] bg-[var(--studelio-bg)]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="font-display text-lg font-semibold italic text-[var(--studelio-blue)]">Studelio Parent</span>
          <nav className="flex gap-2 text-sm">
            <Link className="rounded-full px-3 py-1.5 hover:bg-[var(--studelio-blue-dim)]" href="/parent/dashboard">
              Tableau de bord
            </Link>
            <Link className="rounded-full px-3 py-1.5 hover:bg-[var(--studelio-blue-dim)]" href="/parent/rapports">
              Rapports
            </Link>
            <Link className="rounded-full px-3 py-1.5 hover:bg-[var(--studelio-blue-dim)]" href="/parent/eleves">
              Élèves
            </Link>
          </nav>
          <SignOutButton />
        </div>
      </header>
      <main className="relative z-0 mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
