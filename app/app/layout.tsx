import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";

export default async function StudentAppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { onboardingCompletedAt: true },
    });
    if (!profile?.onboardingCompletedAt) {
      redirect("/onboarding");
    }
  }

  const first = session?.user?.name?.split(/\s+/)[0] ?? "toi";

  return (
    <div className="min-h-screen bg-[var(--studelio-bg)]">
      <div className="studelio-grain pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      <header className="sticky top-0 z-10 border-b border-[var(--studelio-border)] bg-[var(--studelio-bg)]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/app/dashboard" className="font-display text-lg font-semibold italic text-[var(--studelio-blue)]">
            Studelio
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/app/andre"
              className="rounded-full px-3 py-1.5 text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)]"
            >
              André
            </Link>
            <Link
              href="/app/programme"
              className="rounded-full px-3 py-1.5 text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)]"
            >
              Programme
            </Link>
            <Link
              href="/app/bac-blanc"
              className="rounded-full px-3 py-1.5 text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)]"
            >
              Bac blanc
            </Link>
            <Link
              href="/app/settings"
              className="rounded-full px-3 py-1.5 text-[var(--studelio-text-body)] hover:bg-[var(--studelio-blue-dim)]"
            >
              Paramètres
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">Salut {first}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="relative z-0 mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
