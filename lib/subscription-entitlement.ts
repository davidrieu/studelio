import type { Plan, SubStatus } from "@prisma/client";

/** Abonnement « en cours » : accès à l’espace élève /dashboard et suite. */
export function subscriptionGrantsAppAccess(
  sub: { status: SubStatus } | null | undefined,
): sub is { status: SubStatus } {
  if (!sub) return false;
  return sub.status === "ACTIVE" || sub.status === "TRIALING";
}

/** Excellence : blancs inclus dans l’offre (pas d’achat ponctuel). */
export function planIncludesBlancInSubscription(plan: Plan): boolean {
  return plan === "INTENSIF";
}
