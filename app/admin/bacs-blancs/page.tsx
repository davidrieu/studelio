import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminBlancSlotRow } from "@/components/admin-blanc-slot-row";
import { AdminCreateBlancSlotForm } from "@/components/admin-create-blanc-slot-form";
import { prisma } from "@/lib/prisma";

export default async function AdminBacsBlancsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const isAdmin = session.user.role === "ADMIN";

  const slots = await prisma.blancSlot.findMany({
    orderBy: [{ visioAt: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { enrollments: true } },
      enrollments: {
        select: {
          id: true,
          createdAt: true,
          user: { select: { email: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Épreuves blanches — créneaux</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Crée des <strong className="font-medium text-foreground">créneaux</strong> (brevet blanc pour le collège, bac
          blanc pour le lycée / BTS). Les élèves du bon niveau voient les sessions publiées et s’y inscrivent ; le{" "}
          <strong className="font-medium text-foreground">lien visio</strong> n’apparaît qu’une fois inscrits.
        </p>
        {!isAdmin ? (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            Connexion administrateur requise pour créer ou modifier les créneaux.
          </p>
        ) : null}
      </header>

      {isAdmin ? (
        <div className="rounded-[12px] border border-[var(--studelio-border)] bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Nouveau créneau</h2>
          <AdminCreateBlancSlotForm />
        </div>
      ) : null}

      <div className="rounded-[12px] border border-[var(--studelio-border)] bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Créneaux ({slots.length})</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--studelio-border)] text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Titre</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Publié</th>
                <th className="py-2 pr-3 font-medium">Visio</th>
                <th className="py-2 pr-3 font-medium">Inscrits</th>
                {isAdmin ? <th className="py-2 font-medium"> </th> : null}
              </tr>
            </thead>
            <tbody>
              {slots.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-muted-foreground">
                    Aucun créneau pour l’instant.
                  </td>
                </tr>
              ) : (
                slots.map((s) => (
                  <AdminBlancSlotRow
                    key={s.id}
                    isAdmin={isAdmin}
                    row={{
                      id: s.id,
                      title: s.title,
                      kind: s.kind,
                      description: s.description,
                      visioAtIso: s.visioAt?.toISOString() ?? null,
                      visioUrl: s.visioUrl,
                      visioLabel: s.visioLabel,
                      published: s.published,
                      capacity: s.capacity,
                      closesAtIso: s.closesAt?.toISOString() ?? null,
                      enrollmentCount: s._count.enrollments,
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {slots.some((s) => s.enrollments.length > 0) ? (
          <div className="mt-8 space-y-4 border-t border-[var(--studelio-border)] pt-6">
            <h3 className="font-display text-base font-semibold">Inscriptions par créneau</h3>
            <ul className="space-y-3 text-sm">
              {slots
                .filter((s) => s.enrollments.length > 0)
                .map((s) => (
                  <li key={s.id} className="rounded-lg border border-[var(--studelio-border)]/60 bg-muted/20 p-3">
                    <p className="font-medium">{s.title}</p>
                    <ul className="mt-2 list-inside list-disc text-muted-foreground">
                      {s.enrollments.map((e) => (
                        <li key={e.id}>
                          {e.user.email}
                          {e.user.name ? ` — ${e.user.name}` : ""}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
