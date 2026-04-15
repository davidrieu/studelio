import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?session=required");
  }
  if (session.user.role !== "STUDENT") {
    redirect("/parent/dashboard");
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompletedAt: true, niveau: true },
  });

  if (!profile) {
    redirect("/auth/register");
  }
  if (profile.onboardingCompletedAt) {
    redirect("/onboarding/plan");
  }

  return (
    <main
      id="contenu-principal"
      tabIndex={-1}
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12 outline-none"
    >
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--studelio-text)]">Personnaliser Studelio</h1>
        <p className="mt-2 text-[var(--studelio-text-body)]">Quelques réponses pour qu’André te parle vraiment à toi.</p>
      </div>
      <OnboardingForm niveau={profile.niveau} />
    </main>
  );
}
