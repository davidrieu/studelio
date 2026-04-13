# Programmes par niveau (fichiers pour André)

## Organisation attendue

À la racine de ce dossier, crée **un sous-dossier par niveau** (minuscules, comme ci-dessous). Dans chaque dossier :

| Dossier      | Niveau Prisma |
|-------------|---------------|
| `sixieme/`  | 6e            |
| `cinquieme/`| 5e            |
| `quatrieme/`| 4e            |
| `troisieme/`| 3e            |
| `seconde/`  | 2nde          |
| `premiere/` | 1re           |
| `terminale/`| Terminale     |
| `bts/`      | BTS           |

### Fichiers obligatoires / utiles

- **`main.txt`** (obligatoire pour activer ce mode) : vision du programme du niveau, consignes générales pour l’IA, rythme, ce que tu veux qu’André priorise.
- **Autres `.txt`** dans le même dossier (y compris sous-dossiers) :
  - si le **nom du fichier** contient **`corpus`** → classé comme **corpus** (textes, thèmes, matière à exploiter) ;
  - si le nom contient **`module`** → classé comme **module** (ateliers, grammaire, orthographe, etc.) ;
  - sinon → section **« Autres ressources »**.

Tu peux tout mettre **à plat** dans le dossier du niveau (comme aujourd’hui) : pas besoin de sous-dossiers `corpus/` ou `modules/` sauf si tu préfères.

## Carte blanche & restrictions

- Par défaut, André a **carte blanche** pour inventer des exercices **dans le cadre** de `main.txt`, des corpus et des modules.
- Pour **interdire** ou **limiter** explicitement quelque chose, ajoute une ligne dans **n’importe quel** `.txt` :

```text
[RESTRICTION IA] Ne pas proposer de QCM sur ce corpus.
```

Variantes reconnues :

- `[RESTRICTION IA] ...`
- `### RESTRICTION ...` (ligne commençant par un ou plusieurs `#` puis RESTRICTION)
- `<<<IA:INTERDIT>>> ...`

## Fichier `.md` à la racine (`TERMINALE.md`, etc.)

Optionnel : si **aucun** dossier `main.txt` n’existe pour un niveau, le seed peut encore lire un **`NIVEAU.md`** (voir ancienne doc). Dès qu’un dossier avec **`main.txt`** est présent, **c’est lui qui prime** (au chat et au seed).

## Mémoire des exercices

André reçoit aussi des **extraits de ses réponses précédentes** (autres conversations avec le même compte) pour :

- éviter de **répéter mot pour mot** la même consigne ;
- **reprendre un objectif** difficile avec **un autre texte / un autre angle** si l’élève peine encore.

L’historique **de la conversation ouverte** reste dans le fil de messages habituel ; la « mémoire » ajoute surtout les **échanges des autres chats**.

## Limites de taille

Le contenu total par niveau est **tronqué** si nécessaire pour tenir dans le contexte du modèle (le fichier **`main.txt`** est toujours chargé en priorité, puis les autres `.txt` par ordre de chemin). Si tu vois la mention *tronqué*, enlève du texte ou scinde en fichiers plus ciblés.

## Après modification

En local : `npm run db:seed` met à jour le champ `aiBrief` en base (copie du contenu assemblé).  
Au **chat**, les fichiers du dépôt sont relus **à chaque message** (tant que le serveur voit les fichiers déployés), donc un **redéploiement** suffit sur Vercel sans obligatoirement re-seeder — le seed reste utile pour l’aperçu en base / admin futur.
