# Déployer Studelio sur Vercel + Neon (PostgreSQL)

Ce guide part du principe que le code est sur GitHub ([davidrieu/studelio](https://github.com/davidrieu/studelio)).

## En bref : qu’est-ce que tu fais où ?

| Où ? | Rôle |
|------|------|
| **Vercel** | Héberge le site, lance le build : migrations, `generate`, puis **si la base n’a aucun programme** exécution automatique du **seed** (une fois), puis `next build`. Désactiver ce remplissage auto : `STUDELIO_SKIP_DB_BOOTSTRAP=1`. Forcer le seed à chaque build : `build:with-seed`. |
| **Neon** | Fournit **PostgreSQL** dans le cloud. Sur Vercel : `DATABASE_URL` (souvent **poolée**) + `DIRECT_URL` (**directe**, sans `-pooler`) pour que `prisma migrate deploy` fonctionne — voir §3 et §7. |
| **GitHub** | Stocke le code ; Vercel déploie à chaque push sur `main`. |

Le **build Vercel** utilise `npm run vercel-build` : `prisma migrate deploy` (via connexion **directe**), `prisma generate`, puis le script **`bootstrap-db-if-empty`** (seed **uniquement** si `Programme` est vide), puis `next build`. Sur une base **déjà** peuplée, le seed n’est pas relancé. Pour forcer le seed à **chaque** build (ex. preview démo) : `npm run build:with-seed`.

---

## 1. Créer la base PostgreSQL (Neon)

1. Va sur [https://neon.tech](https://neon.tech) et crée un compte (gratuit).
2. **Create project** → choisis une région proche de tes utilisateurs (ex. `Frankfurt`).
3. Dans le dashboard Neon, récupère **deux** chaînes si elles existent :
   - **Pooled** (hôte contenant souvent `-pooler`) → idéale pour l’app sous charge : `DATABASE_URL` sur Vercel.
   - **Direct** (sans pooler) → `DIRECT_URL` sur Vercel. **Obligatoire** pour `prisma migrate deploy` : le pooler PgBouncer ne gère pas correctement le verrou advisory de Prisma (sinon erreur **P1002** au build).
   - Si tu n’as qu’une URL **directe** : mets-la dans `DATABASE_URL` **et** dans `DIRECT_URL` (ou laisse `DIRECT_URL` vide : le script `vercel-build` recopie `DATABASE_URL` dans `DIRECT_URL` si absent).

---

## 2. Projet Vercel

1. Va sur [https://vercel.com](https://vercel.com) et connecte-toi avec GitHub.
2. **Add New… → Project** → importe le dépôt `davidrieu/studelio`.
3. **Framework Preset** : Next.js (détecté automatiquement).
4. **Root Directory** : `.` (racine).
5. **Build Command** : `npm run vercel-build` (recommandé : migrations + seed auto si base vide + build). Le défaut `npm run build` du preset Next.js ne lance **pas** les migrations. Pour le seed à **chaque** build (démo / preview) : `npm run build:with-seed`.

---

## 3. Variables d’environnement sur Vercel

Dans **Project → Settings → Environment Variables**, ajoute au minimum :

| Nom | Valeur | Environnements |
|-----|--------|----------------|
| `DATABASE_URL` | Connection string Neon (souvent **poolée** en prod) | Production, Preview, Development |
| `DIRECT_URL` | Connection string **directe** Neon (sans `-pooler`) — même valeur que `DATABASE_URL` si tu n’utilises pas le pooler | Idem |
| `AUTH_SECRET` | Une chaîne aléatoire **d’au moins 32 caractères** (tu peux en générer une avec un gestionnaire de mots de passe) | Tous |
| `NEXTAUTH_SECRET` | **La même valeur** que `AUTH_SECRET` | Tous |
| `AUTH_URL` | L’URL du site une fois déployé, ex. `https://studelio.vercel.app` | Production |
| `NEXTAUTH_URL` | Identique à `AUTH_URL` pour la prod | Production |

Pour les **Preview** (branches), tu peux mettre l’URL de preview ou laisser vide au début ; NextAuth peut exiger une URL cohérente — en cas d’erreur de callback, ajoute aussi pour Preview une variable `NEXTAUTH_URL` = URL de la preview (visible après un déploiement).

**Optionnel** : `STUDELIO_SKIP_DB_BOOTSTRAP` = `1` pour **ne pas** lancer le seed automatique sur base vide (rare : déploiement sans données démo, seed manuel ailleurs).

**Optionnel** (quand tu les utiliseras) : copie les clés depuis `.env.example` — `GOOGLE_CLIENT_*`, `STRIPE_*`, `ANTHROPIC_API_KEY`, etc.

> **Ne commite jamais** `.env` : les secrets vivent uniquement sur Vercel (et en local sur ton PC).

---

## 4. Premier déploiement

1. Clique **Deploy** sur Vercel.
2. Le build exécute `prisma migrate deploy` (connexion `DIRECT_URL`), puis `prisma generate`, puis **si aucun programme en base** `prisma db seed`, puis `next build`.
3. **Base neuve** : le seed est lancé **automatiquement** au premier build réussi ; les comptes démo sont ceux définis dans `prisma/seed.ts` (ex. `demo@studelio.local`). Tu peux toujours relancer manuellement `npx prisma db seed` depuis ton PC si besoin.
4. Ouvre l’URL du site et connecte-toi avec le compte démo (après premier seed) :
   - **Email :** `demo@studelio.local` / **admin@studelio.local`
   - **Mot de passe :** `studelio-local`
5. Si le build échoue, ouvre les **Build Logs** : souvent `DATABASE_URL` manquante ou mauvaise.

---

## 5. (Optionnel) Lancer le seed depuis ton PC

Utile pour **remplir la base** après un premier déploiement, ou pour rafraîchir les données de démo en local :

```powershell
$env:DATABASE_URL = "postgresql://..."   # même URL que sur Vercel
$env:DIRECT_URL = "postgresql://..."    # en local : souvent identique à DATABASE_URL (voir `.env.example`)
npx prisma db seed
```

---

## 5bis. Nouvelle base PostgreSQL (ex. autre projet Neon, base vide)

Le dépôt contient déjà **toutes les migrations** dans `prisma/migrations/`. Sur une **base neuve**, aucune migration supplémentaire n’est nécessaire tant que le schéma Prisma n’a pas changé par rapport à ce dépôt.

1. Configure sur Vercel `DATABASE_URL` (+ `DIRECT_URL` si pooler) vers la nouvelle base.
2. Déploie : le build exécute **`prisma migrate deploy`**, puis **`prisma db seed` automatiquement** si la table des programmes est encore vide (premier déploiement sur cette base).
3. **Optionnel** : si tu as défini `STUDELIO_SKIP_DB_BOOTSTRAP=1` sur Vercel, remplis la base à la main :
   ```powershell
   $env:DATABASE_URL = "postgresql://..."   # nouvelle Neon
   $env:DIRECT_URL = "postgresql://..."   # souvent identique si URL directe
   npx prisma db seed
   ```
4. Vérifie les comptes démo / admin selon ton `prisma/seed.ts`.

La **version publiée** de l’app pour le suivi des déploiements est le champ **`version`** dans `package.json` (semver).

---

## 6. Après un changement de schéma Prisma

1. En local : `npx prisma migrate dev --name description_du_changement`
2. Commit le dossier `prisma/migrations/`
3. Push sur GitHub → Vercel redéploie et `prisma migrate deploy` applique les nouvelles migrations.

---

## 7. Dépannage rapide

| Problème | Piste |
|----------|--------|
| Build Vercel : erreur Prisma | `DATABASE_URL` manquante ou incorrecte ; SSL : Neon inclut souvent `?sslmode=require`. |
| **P1002** / timeout **advisory lock** (`pg_advisory_lock`) au build | L’URL de migration pointait vers le **pooler** (`-pooler` dans l’hôte). Sur Vercel, `vercel-build` tente de **dériver** l’URL directe Neon si le motif est reconnu ; sinon mets `DIRECT_URL` = URL **directe** (dashboard Neon → *Direct*, sans `-pooler`). |
| `Environment variable not found: DIRECT_URL` en local | Ajoute dans `.env` une ligne `DIRECT_URL="…"` identique à `DATABASE_URL` (voir `.env.example`). Obligatoire pour `prisma migrate dev` / `prisma validate` ; `prisma generate` et `npm run build` peuvent passer sans. |
| Connexion / OAuth bizarre | `AUTH_URL` / `NEXTAUTH_URL` doivent correspondre à l’URL réelle du site (https, sans slash final selon les cas). |
| Compte démo introuvable | Vérifie les logs de build : `[studelio-bootstrap]` doit avoir lancé le seed si la base était vide. Sinon lance `npx prisma db seed` manuellement. Si `STUDELIO_SKIP_DB_BOOTSTRAP=1`, le seed auto est désactivé. |

---

## Références

- [Neon — Connect from Vercel](https://neon.tech/docs/guides/vercel)
- [Prisma — Deploy to Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Auth.js — Environment variables](https://authjs.dev/getting-started/deployment#environment-variables)
