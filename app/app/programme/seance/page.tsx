import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProgrammeGuidedSession } from "@/components/programme-guided-session";
import { niveauLabel } from "@/lib/labels";
import { loadProgrammeFolderForNiveau } from "@/lib/programme-folder-loader";
import { prisma } from "@/lib/prisma";

export default async function ProgrammeSeancePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  let profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { programme: { select: { id: true, title: true } } },
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
      profile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        include: { programme: { select: { id: true, title: true } } },
      });
    }
  }

  if (!profile) {
    redirect("/onboarding");
  }

  const prog = await prisma.programme.findUnique({
    where: { niveau: profile.niveau },
    select: { title: true, aiBrief: true },
  });

  const folder = loadProgrammeFolderForNiveau(profile.niveau, process.cwd());
  const programmeTitle = profile.programme?.title ?? prog?.title ?? `Français — ${niveauLabel[profile.niveau]}`;

  let sourceDetail: string;
  if (folder) {
    const nCorpus = folder.corpus.length;
    const nMod = folder.modules.length;
    sourceDetail = `le dossier « ${folder.dirName}/ » (programme principal, ${nCorpus} corpus, ${nMod} modules)`;
  } else if (prog?.aiBrief?.trim()) {
    sourceDetail = "le brief programme en ligne et les chapitres du parcours Studelio";
  } else {
    sourceDetail = "les chapitres du parcours Studelio et les attendus officiels du niveau";
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-muted-foreground">
        <Link href="/app/programme" className="hover:text-[var(--studelio-text)]">
          ← Parcours & progression
        </Link>
      </nav>
      <ProgrammeGuidedSession
        contextBanner={{
          programmeTitle,
          niveauLabel: niveauLabel[profile.niveau],
          sourceDetail,
        }}
      />
    </div>
  );
}
