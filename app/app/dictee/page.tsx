import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DicteeClient } from "@/components/dictee-client";
import { buttonVariants } from "@/components/ui/button";
import { niveauLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function firstParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function DicteePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  let profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      programme: {
        include: {
          dictations: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, audioUrl: true, order: true },
          },
        },
      },
    },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.programmeId) {
    const match = await prisma.programme.findUnique({
      where: { niveau: profile.niveau },
    });
    if (match) {
      await prisma.studentProfile.update({
        where: { id: profile.id },
        data: { programmeId: match.id },
      });
      profile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          programme: {
            include: {
              dictations: {
                orderBy: { order: "asc" },
                select: { id: true, title: true, audioUrl: true, order: true },
              },
            },
          },
        },
      });
    }
  }

  if (!profile) {
    redirect("/onboarding");
  }

  const dictations = profile.programme?.dictations ?? [];
  const dRaw = firstParam(searchParams?.d)?.trim() ?? "";

  return (
    <div className="space-y-4">
      <div className="sr-only">
        <h1>Dictée avec André</h1>
      </div>
      {dictations.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-8 shadow-[var(--studelio-shadow)]">
          <p className="text-[var(--studelio-text-body)]">
            Aucune dictée pour ton niveau ({niveauLabel[profile.niveau]}) pour l’instant. Les dictées sont ajoutées dans
            l’admin pour le programme qui correspond à ton niveau.
          </p>
          <Link href="/app/programme" className={cn(buttonVariants(), "mt-4 inline-flex rounded-full")}>
            Retour au programme
          </Link>
        </div>
      ) : (
        <DicteeClient dictations={dictations} initialDictationId={dRaw || null} />
      )}
    </div>
  );
}
