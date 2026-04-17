/**
 * Build Vercel : Prisma Migrate a besoin d’une connexion directe PostgreSQL pour
 * `pg_advisory_lock` (échec P1002 / timeout avec l’URL poolée Neon seule).
 *
 * Si DIRECT_URL n’est pas défini, on retombe sur DATABASE_URL (OK pour Docker local
 * ou une seule URL « directe » sur Vercel). Avec Neon pooler sur DATABASE_URL,
 * configure DIRECT_URL = URL directe (dashboard Neon, sans « -pooler »).
 *
 * Après generate : `bootstrap-db-if-empty.cjs` exécute `prisma db seed` si aucune
 * ligne Programme (base neuve). Désactiver : STUDELIO_SKIP_DB_BOOTSTRAP=1.
 */
const { spawnSync } = require("node:child_process");

const withSeed = process.argv.includes("--seed");

const env = { ...process.env };
if (!String(env.DIRECT_URL || "").trim() && env.DATABASE_URL) {
  env.DIRECT_URL = env.DATABASE_URL;
}

function run(cmd) {
  const r = spawnSync(cmd, { shell: true, stdio: "inherit", env });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("npx prisma migrate deploy");
run("npx prisma generate");
if (withSeed) {
  run("npx prisma db seed");
} else {
  run("node scripts/bootstrap-db-if-empty.cjs");
}
run("npx next build");
