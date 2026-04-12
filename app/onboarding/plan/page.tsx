import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OnboardingPlanPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">Choix du plan</h1>
      <p className="text-muted-foreground">Stripe Checkout sera intégré en phase 2.</p>
      <Link href="/app/dashboard" className={cn(buttonVariants({ variant: "outline" }), "w-fit rounded-full")}>
        Aller au tableau de bord
      </Link>
    </div>
  );
}
