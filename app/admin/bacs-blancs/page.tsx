import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminBacTableRow } from "@/components/admin-bac-table-row";
import { AdminCreateBacForm } from "@/components/admin-create-bac-form";
import { prisma } from "@/lib/prisma";
export default async function AdminBacsBlancsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const isAdmin = session.user.role === "ADMIN";

  const [bacs, students] = await Promise.all([
    prisma.bacBlanc.findMany({
      orderBy: [{ visioAt: "asc" }, { trimestre: "asc" }, { sessionNumber: "asc" }],
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", studentProfile: { isNot: null } },
      select: {
        id: true,
        email: true,
        name: true,
        studentProfile: { select: { niveau: true } },
      },
      orderBy: { email: "asc" },
      take: 500,
    }),
  ]);

  const studentOptions = students
    .filter((u) => u.studentProfile)
    .map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      niveau: u.studentProfile!.niveau,
    }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Bacs blancs</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Planifie les sessions en <strong className="font-medium text-foreground">visioconférence</strong> : date,
          lien et optionnellement une étiquette. Les élèves voient le créneau sur leur espace « Bac blanc ».
        </p>
        {!isAdmin ? (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            Connexion administrateur requise pour créer, modifier ou supprimer une planification.
          </p>
        ) : null}
      </header>

      {isAdmin ? <AdminCreateBacForm students={studentOptions} /> : null}

      <div className="rounded-[12px] border border-[var(--studelio-border)] bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Planifications ({bacs.length})</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--studelio-border)] text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Élève</th>
                <th className="py-2 pr-3 font-medium">Épreuve</th>
                <th className="py-2 pr-3 font-medium">T / S</th>
                <th className="py-2 pr-3 font-medium">Visio</th>
                <th className="py-2 pr-3 font-medium">Statut</th>
                {isAdmin ? <th className="py-2 font-medium"> </th> : null}
              </tr>
            </thead>
            <tbody>
              {bacs.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-muted-foreground">
                    Aucune planification pour l’instant.
                  </td>
                </tr>
              ) : (
                bacs.map((b) => (
                  <AdminBacTableRow
                    key={b.id}
                    isAdmin={isAdmin}
                    row={{
                      id: b.id,
                      userEmail: b.user.email,
                      userName: b.user.name,
                      subject: b.subject,
                      niveau: b.niveau,
                      trimestre: b.trimestre,
                      sessionNumber: b.sessionNumber,
                      status: b.status,
                      visioAtIso: b.visioAt?.toISOString() ?? null,
                      visioUrl: b.visioUrl,
                      visioLabel: b.visioLabel,
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
