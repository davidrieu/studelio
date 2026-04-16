import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { STUDENT_THEME_COOKIE } from "@/lib/student-ui-theme";
import { epreuveBlancheShortLabel } from "@/lib/blanc-kind";
import { prisma } from "@/lib/prisma";
import { subscriptionGrantsAppAccess } from "@/lib/subscription-entitlement";
import { SignOutButton } from "@/components/sign-out-button";
import { StudelioLogo } from "@/components/studelio-logo";
import { StudentThemeMenuToggle } from "@/components/student-theme-menu-toggle";
import { cn } from "@/lib/utils";

const navLinkClass =
  "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)] sm:px-3 sm:text-sm";

export default async function StudentAppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let epreuveNavLabel = "Bac blanc";
  if (session?.user?.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { onboardingCompletedAt: true, niveau: true },
    });
    if (!profile?.onboardingCompletedAt) {
      redirect("/onboarding");
    }
    const sub = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    });
    if (!subscriptionGrantsAppAccess(sub)) {
      redirect("/onboarding/plan?sub=required");
    }
    if (profile?.niveau) {
      epreuveNavLabel = epreuveBlancheShortLabel(profile.niveau);
    }
  }

  const first = session?.user?.name?.split(/\s+/)[0] ?? "toi";

  const cookieStore = cookies();
  const isStudentDark = cookieStore.get(STUDENT_THEME_COOKIE)?.value === "dark";

  return (
    <div className={cn("min-h-screen bg-[var(--studelio-bg)] text-foreground", isStudentDark && "dark")}>
      <div className="studelio-grain pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      <header className="sticky top-0 z-10 border-b border-[var(--studelio-border)] bg-[var(--studelio-bg)]/90 backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-6xl px-3 sm:px-4">
          <div className="flex items-center justify-between gap-2 py-2.5 sm:hidden">
            <Link
              href="/app/dashboard"
              className="min-w-0 max-w-[58%] shrink py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--studelio-bg)]"
            >
              <span className="sr-only">Studelio — Tableau de bord</span>
              <StudelioLogo size="sm" className="max-h-7 w-auto" />
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <StudentThemeMenuToggle isDark={isStudentDark} />
              <SignOutButton />
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-1 pb-2 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-0 sm:pt-0">
            <Link
              href="/app/dashboard"
              className="hidden shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--studelio-bg)] sm:block"
            >
              <span className="sr-only">Studelio — Tableau de bord</span>
              <StudelioLogo size="sm" />
            </Link>
            <nav
              className={cn(
                "scrollbar-none flex min-w-0 flex-nowrap items-center gap-0.5 overflow-x-auto overscroll-x-contain pb-1",
                "touch-pan-x sm:flex-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0",
              )}
            >
              <Link href="/app/andre" className={navLinkClass}>
                André
              </Link>
              <Link href="/app/programme/seance" className={navLinkClass}>
                Programme
              </Link>
              <Link href="/app/dictee" className={navLinkClass}>
                Dictée
              </Link>
              <Link href="/app/bac-blanc" className={navLinkClass}>
                {epreuveNavLabel}
              </Link>
              <Link href="/app/settings" className={navLinkClass}>
                Paramètres
              </Link>
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-[var(--studelio-border)] sm:mx-1 sm:inline"
                aria-hidden
              />
              <span className="hidden sm:inline-flex">
                <StudentThemeMenuToggle isDark={isStudentDark} />
              </span>
            </nav>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <span className="max-w-[8rem] truncate text-xs text-muted-foreground lg:max-w-none">
                Salut {first}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>
      <main
        id="contenu-principal"
        tabIndex={-1}
        className="relative z-0 mx-auto max-w-6xl px-3 py-6 outline-none sm:px-4 sm:py-8"
      >
        {children}
      </main>
    </div>
  );
}
