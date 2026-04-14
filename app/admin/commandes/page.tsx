import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { orderKindLabel, orderStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUSES: OrderStatus[] = ["PENDING", "COMPLETED", "CANCELED", "REFUNDED"];

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default async function AdminCommandesPage({
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
        <h1 className="font-display text-xl font-semibold">Commandes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Réservé aux administrateurs.</p>
        <Link href="/admin/dashboard" className="mt-4 inline-block text-sm text-[var(--studelio-blue)] underline">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const stRaw = firstParam(searchParams.status);
  const statusFilter = STATUSES.includes(stRaw as OrderStatus) ? (stRaw as OrderStatus) : undefined;

  const orders = await prisma.order.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { email: true, name: true } },
      lines: { select: { id: true } },
    },
  });

  const buildHref = (next?: OrderStatus | "") => {
    const p = new URLSearchParams();
    if (next) p.set("status", next);
    const qs = p.toString();
    return `/admin/commandes${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">Commandes</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Historique issu de Stripe Checkout : abonnements et achats examen blanc à l’unité. Les statuts sont mis à jour
          par les webhooks (paiement réussi, session expirée).
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref("")}
          className={cn(buttonVariants({ variant: !statusFilter ? "default" : "outline", size: "sm" }), "rounded-full")}
        >
          Toutes
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref(s)}
            className={cn(
              buttonVariants({ variant: statusFilter === s ? "default" : "outline", size: "sm" }),
              "rounded-full",
            )}
          >
            {orderStatusLabel[s]}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-[var(--studelio-border)] bg-card/50 p-8 text-sm text-muted-foreground">
          Aucune commande en base pour l’instant. Après un paiement test ou réel, vérifie que le webhook Stripe appelle
          bien <code className="rounded bg-muted px-1">/api/stripe/webhook</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-[var(--studelio-border)] bg-card shadow-[var(--studelio-shadow)]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--studelio-border)] bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Lignes</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--studelio-border)]/70 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {o.createdAt.toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="max-w-[14rem] px-4 py-3">
                    <div className="truncate font-medium text-[var(--studelio-text)]">{o.user.email}</div>
                    {o.user.name ? (
                      <div className="truncate text-xs text-muted-foreground">{o.user.name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{orderKindLabel[o.kind]}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{orderStatusLabel[o.status]}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{formatMoney(o.totalAmountCents)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.lines.length}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/commandes/${o.id}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")}
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
