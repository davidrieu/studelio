# Déployer Studelio sur Vercel + Neon (PostgreSQL)

Ce guide part du principe que le code est sur GitHub ([davidrieu/studelio](https://github.com/davidrieu/studelio)).

---

## 1. Créer la base PostgreSQL (Neon)

1. Va sur [https://neon.tech](https://neon.tech) et crée un compte (gratuit).
2. **Create project** → choisis une région proche de tes utilisateurs (ex. `Frankfurt`).
3. Une fois le projet créé, copie la **Connection string** (format `postgresql://user:password@.../neondb?sslmode=require`).
   - Tu peux utiliser la connexion **directe** (non poolée) comme seule `DATABASE_URL` pour commencer : c’est le plus simple avec `prisma migrate deploy` sur Vercel.
   - Plus tard, pour la charge, Neon te proposera souvent une URL **pooled** + une **direct** : dans ce cas, voir la doc Neon pour `DIRECT_URL` côté Prisma.

Garde cette URL : c’est ta `DATABASE_URL` sur Vercel.

---

## 2. Projet Vercel

1. Va sur [https://vercel.com](https://vercel.com) et connecte-toi avec GitHub.
2. **Add New… → Project** → importe le dépôt `davidrieu/studelio`.
3. **Framework Preset** : Next.js (détecté automatiquement).
4. **Root Directory** : `.` (racine).
5. **Build Command** : laisse la valeur par défaut (`npm run build` ou `next build` selon l’UI) — le `package.json` lance déjà `prisma migrate deploy` avant `next build`.

---

## 3. Variables d’environnement sur Vercel

Dans **Project → Settings → Environment Variables**, ajoute au minimum :

| Nom | Valeur | Environnements |
|-----|--------|----------------|
| `DATABASE_URL` | La connection string Neon (complète) | Production, Preview, Development |
| `AUTH_SECRET` | Une chaîne aléatoire **d’au moins 32 caractères** (tu peux en générer une avec un gestionnaire de mots de passe) | Tous |
| `NEXTAUTH_SECRET` | **La même valeur** que `AUTH_SECRET` | Tous |
| `AUTH_URL` | L’URL du site une fois déployé, ex. `https://studelio.vercel.app` | Production |
| `NEXTAUTH_URL` | Identique à `AUTH_URL` pour la prod | Production |

Pour les **Preview** (branches), tu peux mettre l’URL de preview ou laisser vide au début ; NextAuth peut exiger une URL cohérente — en cas d’erreur de callback, ajoute aussi pour Preview une variable `NEXTAUTH_URL` = URL de la preview (visible après un déploiement).

**Optionnel** (quand tu les utiliseras) : copie les clés depuis `.env.example` — `GOOGLE_CLIENT_*`, `STRIPE_*`, `ANTHROPIC_API_KEY`, etc.

> **Ne commite jamais** `.env` : les secrets vivent uniquement sur Vercel (et en local sur ton PC).

---

## 4. Premier déploiement

1. Clique **Deploy** sur Vercel.
2. Le build exécute `prisma generate`, puis `prisma migrate deploy` (applique `prisma/migrations`), puis `next build`.
3. Si le build échoue sur `migrate deploy`, vérifie que `DATABASE_URL` est bien définie pour **Production** (et l’environnement que tu build).

---

## 5. Remplir la base (programmes + compte démo)

Le **seed** n’est pas lancé automatiquement sur Vercel (c’est voulu). Une fois le site en ligne :

Sur **ton PC** (avec Node installé), dans le dossier du projet :

```bash
# Remplace par ta DATABASE_URL Neon (entre guillemets)
set DATABASE_URL=postgresql://...
npx prisma db seed
```

Sous PowerShell :

```powershell
$env:DATABASE_URL = "postgresql://..."   # ta chaîne Neon
npx prisma db seed
```

Tu dois voir dans le terminal les lignes du compte démo :

- Email : `demo@studelio.local`
- Mot de passe : `studelio-local`

Ensuite tu peux te connecter sur l’URL Vercel avec ce compte.

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
| Connexion / OAuth bizarre | `AUTH_URL` / `NEXTAUTH_URL` doivent correspondre à l’URL réelle du site (https, sans slash final selon les cas). |
| Compte démo introuvable | Relance `npx prisma db seed` avec la **même** `DATABASE_URL` que la prod. |

---

## Références

- [Neon — Connect from Vercel](https://neon.tech/docs/guides/vercel)
- [Prisma — Deploy to Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Auth.js — Environment variables](https://authjs.dev/getting-started/deployment#environment-variables)
