import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await auth();

  return (
    <div className="min-h-screen bg-[var(--studelio-bg)]">
      <div className="studelio-grain pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      <header className="sticky top-0 z-10 border-b border-[var(--studelio-border)] bg-[var(--studelio-bg)]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
          <span className="font-mono text-sm font-medium text-[var(--studelio-text)]">Admin Studelio</span>
          <nav className="flex flex-wrap gap-1 text-xs sm:text-sm">
            {[
              ["Dashboard", "/admin/dashboard"],
              ["Clé API", "/admin/api-keys"],
              ["Programmes", "/admin/programmes"],
              ["Épreuves blanches", "/admin/bacs-blancs"],
              ["Commandes", "/admin/commandes"],
              ["Utilisateurs", "/admin/utilisateurs"],
              ["Abonnements", "/admin/abonnements"],
              ["Correcteurs", "/admin/correcteurs"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full px-2 py-1 hover:bg-[var(--studelio-blue-dim)] sm:px-3">
                {label}
              </Link>
            ))}
          </nav>
          <SignOutButton />
        </div>
      </header>
      <main className="relative z-0 mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
