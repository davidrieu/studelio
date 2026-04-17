/**
 * Après `prisma migrate deploy` + `generate` : si la base n’a encore aucun
 * programme (Neon / Vercel neuve), lance `prisma db seed` une fois pour
 * remplir programmes, chapitres, comptes démo, etc.
 *
 * Si au moins un programme existe, on ne fait rien (évite de ré-exécuter un
 * seed destructif sur une prod déjà peuplée).
 *
 * Désactiver : STUDELIO_SKIP_DB_BOOTSTRAP=1
 */
const { spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");

const skip = process.env.STUDELIO_SKIP_DB_BOOTSTRAP;
if (skip === "1" || skip === "true") {
  console.log("[studelio-bootstrap] STUDELIO_SKIP_DB_BOOTSTRAP : skip.");
  process.exit(0);
}

if (!String(process.env.DATABASE_URL || "").trim()) {
  console.error("[studelio-bootstrap] DATABASE_URL manquante.");
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  let count = 0;
  try {
    count = await prisma.programme.count();
  } finally {
    await prisma.$disconnect();
  }

  if (count > 0) {
    console.log(`[studelio-bootstrap] ${count} programme(s) déjà en base — pas de seed.`);
    return;
  }

  console.log("[studelio-bootstrap] Aucun programme — exécution de prisma db seed…");
  const r = spawnSync("npx prisma db seed", {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
