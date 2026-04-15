import { cn } from "@/lib/utils";

/** Premier lien focusable : saute navigation / bannières vers la zone principale. */
export function SkipToContent() {
  return (
    <a
      href="#contenu-principal"
      className={cn(
        "fixed left-4 top-4 z-[200] -translate-y-[200%] rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg transition-transform duration-200",
        "bg-[var(--studelio-blue)] text-white",
        "focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      Aller au contenu principal
    </a>
  );
}
