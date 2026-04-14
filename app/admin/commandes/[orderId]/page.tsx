import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { orderKindLabel, orderStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default async function AdminCommandeDetailPage({ params }: { params: { orderId: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      lines: { orderBy: { id: "asc" } },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/commandes" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}>
          ← Commandes
        </Link>
      </div>

      <header className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
        <h1 className="font-display text-2xl font-semibold text-[var(--studelio-text)]">Commande</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{order.id}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Statut</dt>
            <dd className="font-medium">{orderStatusLabel[order.status]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium">{orderKindLabel[order.kind]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-medium">{formatMoney(order.totalAmountCents)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-medium">
              {order.createdAt.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Client</dt>
            <dd className="font-medium">
              {order.user.email}
              {order.user.name ? ` · ${order.user.name}` : ""}
            </dd>
          </div>
          {order.customerEmail ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">E-mail Stripe (checkout)</dt>
              <dd className="font-medium">{order.customerEmail}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Stripe — Checkout session</dt>
            <dd className="break-all font-mono text-xs">{order.stripeCheckoutSessionId}</dd>
          </div>
          {order.stripePaymentIntentId ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Stripe — PaymentIntent</dt>
              <dd className="break-all font-mono text-xs">{order.stripePaymentIntentId}</dd>
            </div>
          ) : null}
          {order.stripeSubscriptionId ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Stripe — Subscription</dt>
              <dd className="break-all font-mono text-xs">{order.stripeSubscriptionId}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)]">
        <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Produits commandés</h2>
        {order.lines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucune ligne enregistrée.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--studelio-border)]">
            {order.lines.map((line) => (
              <li key={line.id} className="flex flex-col gap-1 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-[var(--studelio-text)]">{line.label}</p>
                  {line.stripePriceId ? (
                    <p className="font-mono text-xs text-muted-foreground">{line.stripePriceId}</p>
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground sm:text-right">
                  {line.quantity} × {formatMoney(line.unitAmountCents)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
