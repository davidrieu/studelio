import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { StudentThemeMenuToggle } from "@/components/student-theme-menu-toggle";
import { STUDENT_THEME_COOKIE } from "@/lib/student-ui-theme";
import { cn } from "@/lib/utils";

const parentNavClass =
  "shrink-0 whitespace-nowrap text-[var(--studelio-text-body)] transition-colors hover:text-[var(--studelio-blue)]";

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
      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-10 sm:pt-6 lg:px-8",
        )}
      >
        <header className="mb-6 border-b border-[var(--studelio-border)] pb-5 sm:mb-8 sm:pb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--studelio-text-muted)]">
                  Studelio
                </p>
                <p className="font-display text-lg font-semibold text-[var(--studelio-text)] sm:text-xl">
                  Espace parent
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                <StudentThemeMenuToggle isDark={isStudentDark} />
                <SignOutButton />
              </div>
            </div>
            <nav
              className={cn(
                "scrollbar-none -mx-1 flex flex-nowrap items-center gap-x-4 gap-y-2 overflow-x-auto px-1 pb-0.5 text-sm font-medium",
                "sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0",
              )}
            >
              <Link href="/parent/dashboard" className={parentNavClass}>
                Tableau de bord
              </Link>
              <Link href="/parent/eleves" className={parentNavClass}>
                Élèves
              </Link>
              <Link href="/parent/rapports" className={parentNavClass}>
                Rapports
              </Link>
            </nav>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
