import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProgrammeGuidedSession } from "@/components/programme-guided-session";
import { prisma } from "@/lib/prisma";

export default async function ProgrammeSeancePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { programme: { select: { id: true } } },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.programmeId) {
    const match = await prisma.programme.findUnique({ where: { niveau: profile.niveau } });
    if (match) {
      await prisma.studentProfile.update({
        where: { id: profile.id },
        data: { programmeId: match.id },
      });
    }
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-muted-foreground">
        <Link href="/app/programme" className="hover:text-[var(--studelio-text)]">
          ← Parcours & progression
        </Link>
      </nav>
      <ProgrammeGuidedSession />
    </div>
  );
}
