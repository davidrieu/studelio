import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--studelio-bg-soft)]">
      <div className="studelio-grain pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
        <h1 className="font-display text-4xl font-semibold italic text-[var(--studelio-text)] sm:text-5xl">Studelio</h1>
        <p className="text-lg text-[var(--studelio-text-body)]">
          Aide au français avec <span className="font-medium text-[var(--studelio-blue)]">André</span>, ton professeur IA — méthode
          socratique, sans faire tes devoirs à ta place.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/auth/login" className={cn(buttonVariants(), "rounded-full px-8")}>
            Connexion
          </Link>
          <Link
            href="/auth/register"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-full border-[var(--studelio-blue)] px-8 text-[var(--studelio-blue)]",
            )}
          >
            Inscription
          </Link>
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          La page d’accueil marketing finale sera sur WordPress (hors scope) ; ceci sert de point d’entrée pour le développement.
        </p>
      </div>
    </div>
  );
}
