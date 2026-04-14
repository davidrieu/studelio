/**
 * Crée (ou réutilise) les produits + prix d’abonnement Studelio dans Stripe.
 * Idempotent : repère les produits via metadata `studelio_plan`.
 *
 * Usage : définir STRIPE_SECRET_KEY (test ou live), puis :
 *   npx tsx scripts/stripe-sync-products.ts
 */
import "dotenv/config";
import type { Plan } from "@prisma/client";
import Stripe from "stripe";

const PLANS: {
  plan: Plan;
  name: string;
  description: string;
  amountCents: number;
}[] = [
  {
    plan: "ESSENTIEL",
    name: "Studelio — Essentiel",
    description:
      "André (prof IA), parcours adapté, programmes alignés sur les attendus scolaires, correction détaillée, suivi des progrès, aide aux devoirs (chat). Sans accès parent/tuteur ni examens blancs inclus. Essai 3 jours puis mensuel.",
    amountCents: 999,
  },
  {
    plan: "STANDARD",
    name: "Studelio — Progression",
    description:
      "Tout Essentiel + accès parent/tuteur. Examens blancs et correction enseignant non inclus (à l’unité ou offre Excellence). Essai 3 jours puis mensuel.",
    amountCents: 1599,
  },
  {
    plan: "INTENSIF",
    name: "Studelio — Excellence",
    description:
      "Tout Progression + simulations examen blanc (brevet/bac), correction blancs par enseignant, accès anticipé aux nouveautés. Essai 3 jours puis mensuel.",
    amountCents: 2599,
  },
];

async function findProductByPlan(stripe: Stripe, plan: Plan): Promise<Stripe.Product | null> {
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.products.list({ active: true, limit: 100, starting_after: startingAfter });
    const found = page.data.find((p) => p.metadata?.studelio_plan === plan);
    if (found) return found;
    if (!page.has_more) return null;
    startingAfter = page.data[page.data.length - 1]!.id;
  }
}

async function findMatchingPrice(
  stripe: Stripe,
  productId: string,
  amountCents: number,
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 50 });
  return (
    prices.data.find(
      (p) =>
        p.currency === "eur" &&
        p.unit_amount === amountCents &&
        p.recurring?.interval === "month" &&
        p.type === "recurring",
    ) ?? null
  );
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error("❌ STRIPE_SECRET_KEY est vide. Ajoute la clé dans .env puis relance.");
    process.exit(1);
  }

  const stripe = new Stripe(key, { typescript: true });
  const mode = key.startsWith("sk_live") ? "live" : "test";
  console.log(`Stripe sync — mode ${mode}\n`);

  const priceIds: Record<Plan, string> = {} as Record<Plan, string>;

  for (const def of PLANS) {
    let product = await findProductByPlan(stripe, def.plan);
    if (!product) {
      product = await stripe.products.create({
        name: def.name,
        description: def.description,
        metadata: { studelio_plan: def.plan },
      });
      console.log(`✓ Produit créé : ${def.name} (${product.id})`);
    } else {
      console.log(`· Produit existant : ${product.name} (${product.id})`);
    }

    let price = await findMatchingPrice(stripe, product.id, def.amountCents);
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: def.amountCents,
        recurring: { interval: "month" },
        metadata: { studelio_plan: def.plan, studelio: "subscription" },
      });
      console.log(`  ✓ Prix créé : ${(def.amountCents / 100).toFixed(2)} € / mois → ${price.id}`);
    } else {
      console.log(`  · Prix existant : ${(def.amountCents / 100).toFixed(2)} € / mois → ${price.id}`);
    }

    priceIds[def.plan] = price.id;
  }

  console.log("\n--- Copier dans .env ---\n");
  console.log(`STRIPE_PRICE_ESSENTIEL=${priceIds.ESSENTIEL}`);
  console.log(`STRIPE_PRICE_STANDARD=${priceIds.STANDARD}`);
  console.log(`STRIPE_PRICE_INTENSIF=${priceIds.INTENSIF}`);
  console.log("\nTerminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
