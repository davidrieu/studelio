import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminBlancSlotRow } from "@/components/admin-blanc-slot-row";
import { AdminCreateBlancSlotForm } from "@/components/admin-create-blanc-slot-form";
import { AdminEnrollmentCorrectionForm } from "@/components/admin-enrollment-correction-form";
import { bacBlancStatusLabel, niveauLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function AdminBacsBlancsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }

  const isAdmin = session.user.role === "ADMIN";
  const isStaff = isAdmin || session.user.role === "CORRECTOR";

  const [slots, enrollments] = await Promise.all([
    prisma.blancSlot.findMany({
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
    }),
    isStaff
      ? prisma.blancEnrollment.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            slot: { select: { title: true, kind: true } },
            user: {
              select: {
                email: true,
                name: true,
                studentProfile: { select: { niveau: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Épreuves blanches — créneaux</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Crée des <strong className="font-medium text-foreground">créneaux</strong> (brevet blanc pour le collège, bac
          blanc pour le lycée / BTS). Les élèves s’inscrivent ; le <strong className="font-medium text-foreground">lien
          visio</strong> et le <strong className="font-medium text-foreground">sujet</strong> sont visibles une fois
          inscrits. Les <strong className="font-medium text-foreground">copies</strong> et la{" "}
          <strong className="font-medium text-foreground">correction</strong> sont suivies ci-dessous.
        </p>
        {!isAdmin ? (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            Connexion administrateur requise pour créer ou modifier les créneaux. Les correcteurs peuvent mettre à jour
            le suivi des copies.
          </p>
        ) : null}
      </header>

      {isStaff && enrollments.length > 0 ? (
        <div className="rounded-[12px] border border-[var(--studelio-border)] bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Suivi des copies ({enrollments.length})</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Statut, note et commentaire — enregistrés au nom de ton compte correcteur ou admin.
          </p>
          <ul className="mt-4 space-y-4">
            {enrollments.map((e) => {
              const niveau = e.user.studentProfile?.niveau;
              return (
                <li
                  key={e.id}
                  className="rounded-xl border border-[var(--studelio-border)]/70 bg-muted/15 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-foreground">{e.slot.title}</p>
                    <span className="text-xs text-muted-foreground">{bacBlancStatusLabel[e.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.user.email}
                    {e.user.name ? ` — ${e.user.name}` : ""}
                    {niveau ? ` · ${niveauLabel[niveau]}` : ""}
                  </p>
                  {e.copieUrl ? (
                    <a
                      href={e.copieUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-[var(--studelio-blue)] underline"
                    >
                      Copie élève
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Pas encore de copie.</p>
                  )}
                  <AdminEnrollmentCorrectionForm
                    enrollmentId={e.id}
                    defaultStatus={e.status}
                    defaultNote={e.noteFinale}
                    defaultCommentaire={e.commentaire}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

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
                      sujetUrl: s.sujetUrl,
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
                      {s.enrollments.map((en) => (
                        <li key={en.id}>
                          {en.user.email}
                          {en.user.name ? ` — ${en.user.name}` : ""}
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
