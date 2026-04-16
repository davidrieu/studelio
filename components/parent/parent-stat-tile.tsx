import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** Tuile chiffre-clé — même esprit que le dashboard élève (carte + hover). */
export function ParentStatTile({ label, children, className }: Props) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[20px] border border-[var(--studelio-border)]",
        "bg-gradient-to-b from-card to-[var(--studelio-bg-soft)]/25 p-6 shadow-[var(--studelio-shadow)]",
        "ring-1 ring-transparent transition-shadow duration-300 hover:shadow-lg hover:shadow-[var(--studelio-blue)]/5 hover:ring-[var(--studelio-blue)]/15",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-[var(--studelio-blue)]/0 via-[var(--studelio-blue)]/35 to-[var(--studelio-blue)]/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="relative z-10 mt-1">{children}</div>
    </div>
  );
}
