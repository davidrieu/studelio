import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDictationsPanel } from "@/components/admin-dictations-panel";
import { niveauLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function AdminProgrammeDictationsPage({
  params,
}: {
  params: { programmeId: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  const { programmeId } = params;

  const programme = await prisma.programme.findUnique({
    where: { id: programmeId },
    select: {
      id: true,
      niveau: true,
      title: true,
      dictations: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, audioUrl: true, correctedText: true, order: true },
      },
    },
  });

  if (!programme) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin/programmes" className="hover:text-[var(--studelio-text)] hover:underline">
          ← Programmes
        </Link>
      </nav>
      <header>
        <h1 className="font-display text-2xl font-semibold">Dictées — {niveauLabel[programme.niveau]}</h1>
        <p className="mt-1 text-muted-foreground">{programme.title}</p>
        <p className="mt-3 max-w-2xl text-sm text-[var(--studelio-text-body)]">
          Envoie un <strong>fichier</strong> (.mp3, .m4a, .mp4…) via Uploadthing (recommandé) ou colle une URL directe. Le
          texte corrigé reste dans l’app ; André ne reçoit que les titres pour proposer les dictées en séance.
        </p>
      </header>

      <AdminDictationsPanel programmeId={programme.id} initialRows={programme.dictations} />
    </div>
  );
}
