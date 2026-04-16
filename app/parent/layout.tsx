import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { StudentThemeMenuToggle } from "@/components/student-theme-menu-toggle";
import { STUDENT_THEME_COOKIE } from "@/lib/student-ui-theme";
import { cn } from "@/lib/utils";

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--studelio-bg)] p-6 text-[var(--studelio-text)]">
        <p className="text-sm text-muted-foreground">Accès réservé aux comptes parent.</p>
      </div>
    );
  }

  const themeCookie = cookies().get(STUDENT_THEME_COOKIE)?.value;
  const isStudentDark = themeCookie === "dark";

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-x-hidden bg-[var(--studelio-bg)] text-foreground",
        isStudentDark && "dark",
      )}
    >
      <div className="studelio-grain pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-[var(--studelio-border)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--studelio-text-muted)]">
              Studelio
            </p>
            <p className="font-display text-lg font-semibold text-[var(--studelio-text)]">Espace parent</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
              <Link
                href="/parent/dashboard"
                className="text-[var(--studelio-text-body)] transition-colors hover:text-[var(--studelio-blue)]"
              >
                Tableau de bord
              </Link>
              <Link
                href="/parent/eleves"
                className="text-[var(--studelio-text-body)] transition-colors hover:text-[var(--studelio-blue)]"
              >
                Élèves
              </Link>
              <Link
                href="/parent/rapports"
                className="text-[var(--studelio-text-body)] transition-colors hover:text-[var(--studelio-blue)]"
              >
                Rapports
              </Link>
            </nav>
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden h-6 w-px bg-[var(--studelio-border)] sm:block" aria-hidden />
              <StudentThemeMenuToggle isDark={isStudentDark} />
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
