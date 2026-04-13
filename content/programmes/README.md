# Programmes par niveau (brief pour l’IA)

C’est **l’endroit prévu** pour rédiger ce qu’**André** doit suivre comme ligne pédagogique par niveau. Le contenu est lu au **`npm run db:seed`** (et au build Vercel si le seed est activé), puis stocké en base dans le champ **`Programme.aiBrief`**.

## Fichiers

Crée **un fichier Markdown par niveau**, nommé exactement comme l’enum Prisma `Niveau` :

| Fichier        | Niveau      |
|----------------|-------------|
| `SIXIEME.md`   | 6e          |
| `CINQUIEME.md` | 5e          |
| `QUATRIEME.md` | 4e          |
| `TROISIEME.md` | 3e          |
| `SECONDE.md`   | 2nde        |
| `PREMIERE.md`  | 1re         |
| `TERMINALE.md` | Terminale   |
| `BTS.md`       | BTS         |

Si un fichier **n’existe pas**, le seed **ne modifie pas** `aiBrief` en mise à jour (le texte déjà en base est conservé). À la **première création**, `aiBrief` reste vide tant qu’aucun fichier n’a été ajouté.

## Format (frontmatter optionnel)

Tu peux commencer par un **YAML minimal** entre `---` pour surcharger le titre ou la description affichés dans l’app (sinon ce sont les valeurs définies dans `prisma/data/programmes.ts`) :

```markdown
---
title: Français — 6e (parcours Studelio)
description: Cycle 4 — fondations et consolidation.
---

Ici, tout le corps du fichier = **consignes pour l’IA** : objectifs annuels, méthode,
types d’exercices à privilégier, thèmes littéraires, grammaire prioritaire, etc.
Tu as **carte blanche** sur la forme : listes, paragraphes, exemples de consignes types…
```

Tout ce qui est **sous le second `---`** est injecté dans le **prompt système** d’André, avec les **chapitres** issus du seed (`programmes.ts`) listés à part comme « thèmes du parcours ».

## Chaîne complète

1. Éditer ou créer `content/programmes/TERMINALE.md` (par ex.).
2. Lancer **`npm run db:seed`** en local (ou déployer : le script `build` inclut le seed sur Vercel).
3. André utilisera ce brief pour **proposer des exercices** alignés sur le programme, tout en **s’adaptant** au profil (tags, centres d’intérêt) défini à l’onboarding.

Les **chapitres** détaillés (radar, progression) restent dans **`prisma/data/programmes.ts`** : ce sont les repères structurés côté interface ; le `.md` pilote surtout la **liberté pédagogique** de l’IA dans ce cadre.
