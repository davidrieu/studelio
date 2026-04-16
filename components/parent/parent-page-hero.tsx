import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

/**
 * Bandeau d’intro aligné sur les pages élève (gradient, halos, typographie Studelio).
 */
export function ParentPageHero({ title, description, backHref, backLabel }: Props) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-[var(--studelio-border)]",
        "bg-gradient-to-br from-[var(--studelio-bg-soft)] via-card to-[var(--studelio-bg-muted)]/80",
        "p-6 shadow-[var(--studelio-shadow)] sm:p-8",
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--studelio-blue)]/[0.07] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-violet-500/[0.06] blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--studelio-text-muted)]">
            Espace parent
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--studelio-text)] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--studelio-text-body)] sm:text-base">
            {description}
          </p>
        </div>
        {backHref ? (
          <Link
            href={backHref}
            className="shrink-0 rounded-full border border-[var(--studelio-border)] bg-card/70 px-4 py-2 text-sm font-medium text-[var(--studelio-text-body)] shadow-sm transition-colors hover:border-[var(--studelio-blue)]/25 hover:bg-[var(--studelio-blue-dim)] hover:text-[var(--studelio-text)]"
          >
            {backLabel ?? "← Tableau de bord"}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
