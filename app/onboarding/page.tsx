import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-3xl font-semibold text-[var(--studelio-text)]">Onboarding</h1>
      <p className="text-[var(--studelio-text-body)]">
        Les étapes profil (centres d’intérêt, tags) seront détaillées ici. Ensuite, choix du plan.
      </p>
      <Link href="/onboarding/plan" className={cn(buttonVariants(), "w-fit rounded-full")}>
        Choisir mon plan
      </Link>
    </div>
  );
}
