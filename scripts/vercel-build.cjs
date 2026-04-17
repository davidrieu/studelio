/**
 * Build Vercel : Prisma Migrate a besoin d’une connexion directe PostgreSQL pour
 * `pg_advisory_lock` (échec P1002 / timeout avec l’URL poolée Neon seule).
 *
 * Si DIRECT_URL n’est pas défini, on retombe sur DATABASE_URL (OK pour Docker local
 * ou une seule URL « directe » sur Vercel).
 * Neon : si DIRECT_URL pointe encore vers le host **-pooler** (copié par erreur depuis
 * DATABASE_URL), on dérive l’URL **directe** (remplace `-pooler.` dans le hostname)
 * pour que `migrate deploy` puisse acquérir le verrou advisory — sinon P1002.
 *
 * Après generate : `bootstrap-db-if-empty.cjs` exécute `prisma db seed` si aucune
 * ligne Programme (base neuve). Désactiver : STUDELIO_SKIP_DB_BOOTSTRAP=1.
 */
const { spawnSync } = require("node:child_process");

const withSeed = process.argv.includes("--seed");

/** Neon poolé : `…-pooler.<suite>` → même endpoint sans `-pooler` (connexion directe). */
function tryNeonDirectFromPoolerUrl(connectionString) {
  try {
    const u = new URL(connectionString);
    if (!u.hostname.includes("-pooler")) return null;
    const nextHost = u.hostname.replace(/-pooler(?=\.)/, "");
    if (nextHost === u.hostname) return null;
    u.hostname = nextHost;
    return u.toString();
  } catch {
    return null;
  }
}

const env = { ...process.env };
if (!String(env.DIRECT_URL || "").trim() && env.DATABASE_URL) {
  env.DIRECT_URL = env.DATABASE_URL;
}
const derivedDirect = tryNeonDirectFromPoolerUrl(String(env.DIRECT_URL || ""));
if (derivedDirect && derivedDirect !== env.DIRECT_URL) {
  console.log(
    "[vercel-build] DIRECT_URL utilisait le pooler Neon — URL directe dérivée pour prisma migrate (évite P1002).",
  );
  env.DIRECT_URL = derivedDirect;
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
