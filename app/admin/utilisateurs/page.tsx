import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { niveauLabel, planLabel, roleLabel, subStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import type { Role, SubStatus } from "@prisma/client";

const roles: Role[] = ["STUDENT", "PARENT", "CORRECTOR", "ADMIN"];

const SUB_STATUSES: SubStatus[] = ["TRIALING", "ACTIVE", "INCOMPLETE", "PAST_DUE", "CANCELED"];

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function AdminUtilisateursPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }
  if (session.user.role !== "ADMIN") {
    return (
      <div className="rounded-[12px] border border-amber-500/30 bg-amber-500/10 p-8">
        <h1 className="font-display text-xl font-semibold">Utilisateurs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page est réservée aux <strong className="text-foreground">administrateurs</strong>. Les correcteurs
          retrouvent les élèves dans le suivi des copies (épreuves blanches).
        </p>
        <Link href="/admin/dashboard" className="mt-4 inline-block text-sm text-[var(--studelio-blue)] underline">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const roleFilter = firstParam(searchParams.role);
  const subFilter = firstParam(searchParams.sub);
  const q = firstParam(searchParams.q)?.trim() ?? "";

  const validRole = roles.includes(roleFilter as Role) ? (roleFilter as Role) : undefined;
  const validSub = SUB_STATUSES.includes(subFilter as SubStatus) ? (subFilter as SubStatus) : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(validRole ? { role: validRole } : {}),
      ...(validSub ? { subscription: { status: validSub } } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      studentProfile: { select: { niveau: true } },
      subscription: { select: { plan: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const buildHref = (nextRole?: string, nextQ?: string, nextSub?: string) => {
    const params = new URLSearchParams();
    const r = nextRole !== undefined ? nextRole : validRole ?? "";
    const search = nextQ !== undefined ? nextQ : q;
    const s = nextSub !== undefined ? nextSub : validSub ?? "";
    if (r) params.set("role", r);
    if (search) params.set("q", search);
    if (s) params.set("sub", s);
    const qs = params.toString();
    return `/admin/utilisateurs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Utilisateurs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recherche par email ou nom, filtre par rôle ou par statut d’abonnement Stripe (essai, actif, etc.) — 200
          résultats max.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Rôle :</span>
        <Link
          href={buildHref("", q)}
          className={cn(
            "rounded-full px-3 py-1 text-xs",
            !validRole ? "bg-[var(--studelio-blue-dim)] font-medium text-[var(--studelio-text)]" : "border border-input hover:bg-muted",
          )}
        >
          Tous
        </Link>
        {roles.map((r) => (
          <Link
            key={r}
            href={buildHref(r, q)}
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              validRole === r
                ? "bg-[var(--studelio-blue-dim)] font-medium text-[var(--studelio-text)]"
                : "border border-input hover:bg-muted",
            )}
          >
            {roleLabel[r]}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Abonnement :</span>
        <Link
          href={buildHref(undefined, undefined, "")}
          className={cn(
            "rounded-full px-3 py-1 text-xs",
            !validSub ? "bg-[var(--studelio-blue-dim)] font-medium text-[var(--studelio-text)]" : "border border-input hover:bg-muted",
          )}
        >
          Tous
        </Link>
        {SUB_STATUSES.map((st) => (
          <Link
            key={st}
            href={buildHref(validRole ?? "", q, st)}
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              validSub === st
                ? "bg-[var(--studelio-blue-dim)] font-medium text-[var(--studelio-text)]"
                : "border border-input hover:bg-muted",
            )}
          >
            {subStatusLabel[st]}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        {validRole ? <input type="hidden" name="role" value={validRole} /> : null}
        {validSub ? <input type="hidden" name="sub" value={validSub} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Email ou nom…"
          className="min-w-[200px] flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-full border border-input bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Rechercher
        </button>
      </form>

      <div className="overflow-x-auto rounded-[12px] border border-[var(--studelio-border)] bg-card">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--studelio-border)] text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-3 pl-4 pr-3 font-medium">Email</th>
              <th className="py-3 pr-3 font-medium">Nom</th>
              <th className="py-3 pr-3 font-medium">Rôle</th>
              <th className="py-3 pr-3 font-medium">Niveau</th>
              <th className="py-3 pr-3 font-medium">Abonnement</th>
              <th className="py-3 pr-4 font-medium">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun utilisateur ne correspond aux critères.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--studelio-border)]/50">
                  <td className="py-2.5 pl-4 pr-3 font-mono text-xs">{u.email}</td>
                  <td className="py-2.5 pr-3">{u.name ?? "—"}</td>
                  <td className="py-2.5 pr-3">{roleLabel[u.role]}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {u.studentProfile ? niveauLabel[u.studentProfile.niveau] : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-sm">
                    {u.subscription ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-[var(--studelio-text)]">
                          {planLabel[u.subscription.plan]}
                        </span>
                        <span
                          className={cn(
                            "w-fit rounded-full px-2 py-0.5 text-[11px] font-medium",
                            u.subscription.status === "TRIALING"
                              ? "bg-amber-500/15 text-amber-900 dark:text-amber-100"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {subStatusLabel[u.subscription.status]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                    {u.createdAt.toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
