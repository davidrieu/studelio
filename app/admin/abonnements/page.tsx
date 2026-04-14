import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminAbonnementsPage() {
  return (
    <div className="rounded-[12px] border border-[var(--studelio-border)] bg-card p-8">
      <h1 className="font-display text-2xl font-semibold">Abonnements</h1>
      <p className="mt-2 text-muted-foreground">
        MRR et synthèse Stripe — à venir. Les paiements récents (abonnements + options) sont listés sous{" "}
        <strong className="text-foreground">Commandes</strong>.
      </p>
      <Link href="/admin/commandes" className={cn(buttonVariants(), "mt-4 inline-flex rounded-full")}>
        Voir les commandes
      </Link>
    </div>
  );
}
