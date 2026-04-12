import type { SubStatus } from "@prisma/client";
import type Stripe from "stripe";

export function stripeSubscriptionToSubStatus(status: Stripe.Subscription.Status): SubStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}
