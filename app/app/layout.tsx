import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { STUDENT_THEME_COOKIE } from "@/lib/student-ui-theme";
import { epreuveBlancheShortLabel } from "@/lib/blanc-kind";
import { prisma } from "@/lib/prisma";
import { subscriptionGrantsAppAccess } from "@/lib/subscription-entitlement";
import { SignOutButton } from "@/components/sign-out-button";
import { StudentThemeMenuToggle } from "@/components/student-theme-menu-toggle";
import { cn } from "@/lib/utils";

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
      <header className="sticky top-0 z-10 border-b border-[var(--studelio-border)] bg-[var(--studelio-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
          <Link
            href="/app/dashboard"
            className="shrink-0 font-display text-lg font-semibold italic text-[var(--studelio-blue)]"
          >
            Studelio
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm sm:flex-nowrap sm:justify-center">
            <Link
              href="/app/andre"
              className="shrink-0 rounded-full px-3 py-1.5 text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)]"
            >
              André
            </Link>
            <Link
              href="/app/programme/seance"
              className="shrink-0 rounded-full px-3 py-1.5 text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)]"
            >
              Programme
            </Link>
            <Link
              href="/app/dictee"
              className="shrink-0 rounded-full px-3 py-1.5 text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)]"
            >
              Dictée
            </Link>
            <Link
              href="/app/bac-blanc"
              className="shrink-0 rounded-full px-3 py-1.5 text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)]"
            >
              {epreuveNavLabel}
            </Link>
            <Link
              href="/app/settings"
              className="shrink-0 rounded-full px-3 py-1.5 text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)]"
            >
              Paramètres
            </Link>
            <span
              className="mx-0.5 hidden h-5 w-px shrink-0 bg-[var(--studelio-border)] sm:mx-1 sm:inline"
              aria-hidden
            />
            <StudentThemeMenuToggle isDark={isStudentDark} />
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:ml-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">Salut {first}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="relative z-0 mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
