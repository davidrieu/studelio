# STUDELIO — Prompt Cursor · Spécification complète de l'application SaaS

---

## CONTEXTE PRODUIT

Studelio est une application SaaS d'aide à l'apprentissage du français pour les élèves de la 6ème à la Terminale (et BTS). Elle repose sur **André**, un professeur IA basé sur l'API Claude d'Anthropic, qui guide les élèves par méthode socratique — sans jamais faire les devoirs à leur place.

L'application propose :
- Une aide aux devoirs en temps réel (chat avec André)
- Un programme personnalisé adapté au niveau et aux erreurs de l'élève
- Des bacs blancs corrigés par de vrais professeurs (2 par trimestre)
- Un tableau de bord parent
- Un espace d'administration (backoffice)

---

## STACK TECHNIQUE

```
Frontend   : Next.js 14 (App Router) + TypeScript
Styling    : Tailwind CSS + shadcn/ui
Auth       : NextAuth.js v5 (credentials + OAuth Google/Apple)
BDD        : PostgreSQL via Prisma ORM
Paiement   : Stripe (abonnements récurrents)
IA         : Anthropic SDK (claude-sonnet-4-6)
Upload     : Uploadthing (photos de devoirs)
Email      : Resend + React Email
Déploiement: Vercel
```

---

## DESIGN SYSTEM

### Thème par défaut : MODE CLAIR

```css
/* Couleurs */
--bg:          #FFFFFF
--bg-soft:     #F0F4FF
--bg-muted:    #E2E8FF
--blue:        #2451b0      /* couleur principale */
--blue-hover:  #3a6ad4
--blue-dim:    rgba(36,81,176,0.10)
--red:         #c73d3d      /* accent */
--red-dim:     rgba(199,61,61,0.10)
--green:       #16a34a
--green-dim:   rgba(22,163,74,0.10)
--text:        #0f172a      /* titres */
--text-body:   #374260      /* corps */
--text-muted:  #7a84a0      /* labels */
--border:      rgba(36,81,176,0.12)
--shadow:      0 4px 20px rgba(36,81,176,0.08)

/* Typographie */
Font display : Playfair Display (titres, italique)
Font body    : DM Sans (interface)
Font mono    : DM Mono (labels, codes, tags)
```

### Mode sombre (toggle utilisateur, stocké en localStorage + cookie)

```css
--bg:       #0C0C0F
--bg-soft:  #111115
--bg-muted: #18181E
--blue:     #3261c5
--text:     #F5F7FF
--text-body:#E2E2EE
--border:   rgba(50,97,197,0.15)
```

### Règles UI globales
- Border-radius cards : 12px (sm) / 20px (lg)
- Boutons : border-radius 100px (pilule)
- Ombres : bleues diluées (jamais noires)
- Animations : transitions 200–250ms ease
- Grain overlay subtil sur tous les fonds (opacity 0.02)

---

## ARCHITECTURE DES ROUTES

```
/                          → Landing page (WordPress, hors scope)
/auth/login                → Connexion
/auth/register             → Inscription
/auth/forgot-password      → Mot de passe oublié
/onboarding                → Setup profil élève post-inscription
/onboarding/plan           → Sélection du plan

/app                       → Layout app authentifiée
/app/dashboard             → Tableau de bord élève
/app/andre                 → Chat aide aux devoirs (André)
/app/programme             → Programme personnalisé
/app/bac-blanc             → Bacs blancs
/app/bac-blanc/[id]        → Détail d'un bac blanc
/app/profil                → Profil élève
/app/settings              → Paramètres compte

/parent                    → Layout parent
/parent/dashboard          → Tableau de bord parent
/parent/rapports           → Rapports hebdomadaires
/parent/eleves             → Gestion des profils élèves

/admin                     → Layout backoffice (role: ADMIN)
/admin/dashboard           → Vue générale
/admin/api-keys            → Configuration clé API Claude
/admin/programmes          → Gestion des programmes par niveau
/admin/bacs-blancs         → Gestion des sessions bac blanc
/admin/utilisateurs        → Gestion utilisateurs
/admin/abonnements         → Vue abonnements Stripe
/admin/correcteurs         → Gestion des correcteurs
```

---

## MODÈLE DE DONNÉES (Prisma Schema)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?   // hashé bcrypt
  role          Role      @default(STUDENT)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  subscription  Subscription?
  studentProfile StudentProfile?
  parentProfile  ParentProfile?
  sessions      ChatSession[]
  bacBlancs     BacBlanc[]
  accounts      Account[]    // NextAuth OAuth
}

enum Role {
  STUDENT
  PARENT
  CORRECTOR
  ADMIN
}

model StudentProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  
  niveau          Niveau   // enum: SIXIEME, CINQUIEME, etc.
  interests       String[] // centres d'intérêt pour André
  tags            Tag[]    // DYS, TDAH, HPI, etc.
  
  parentId        String?
  parent          ParentProfile? @relation(fields: [parentId], references: [id])
  
  streakDays      Int      @default(0)
  totalMinutes    Int      @default(0)
  lastSessionAt   DateTime?
  
  errorProfile    Json     // { orthographe: 0.7, conjugaison: 0.3, ... }
  programmeId     String?
  programme       Programme? @relation(fields: [programmeId], references: [id])
}

enum Niveau {
  SIXIEME
  CINQUIEME
  QUATRIEME
  TROISIEME
  SECONDE
  PREMIERE
  TERMINALE
  BTS
}

enum Tag {
  DYSLEXIE
  DYSORTHOGRAPHIE
  DYSCALCULIE
  TDAH
  HPI
  TROUBLE_ANXIEUX
}

model ParentProfile {
  id              String           @id @default(cuid())
  userId          String           @unique
  user            User             @relation(fields: [userId], references: [id])
  children        StudentProfile[]
  
  emailReports    Boolean          @default(true)
  reportFrequency String           @default("weekly")
}

model Subscription {
  id                   String   @id @default(cuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id])
  
  stripeCustomerId     String   @unique
  stripeSubscriptionId String?  @unique
  stripePriceId        String?
  
  plan                 Plan     @default(ESSENTIEL)
  status               SubStatus
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean  @default(false)
  
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

enum Plan {
  ESSENTIEL   // 9€/mois
  STANDARD    // 17€/mois
  INTENSIF    // 29€/mois
}

enum SubStatus {
  ACTIVE
  TRIALING
  PAST_DUE
  CANCELED
  INCOMPLETE
}

model ChatSession {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  
  subject     String?       // matière détectée
  niveau      Niveau?
  
  messages    ChatMessage[]
  
  attachments Attachment[]
  
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model ChatMessage {
  id          String      @id @default(cuid())
  sessionId   String
  session     ChatSession @relation(fields: [sessionId], references: [id])
  
  role        MessageRole // USER | ANDRE
  content     String      @db.Text
  
  tokensUsed  Int?
  
  createdAt   DateTime    @default(now())
}

enum MessageRole {
  USER
  ANDRE
}

model Attachment {
  id          String      @id @default(cuid())
  sessionId   String
  session     ChatSession @relation(fields: [sessionId], references: [id])
  
  url         String      // Uploadthing URL
  type        String      // image/jpeg, image/png, application/pdf
  filename    String
  sizeBytes   Int
  
  createdAt   DateTime    @default(now())
}

model Programme {
  id          String           @id @default(cuid())
  niveau      Niveau           @unique
  
  title       String
  description String?
  
  chapters    ProgrammeChapter[]
  students    StudentProfile[]
  
  updatedAt   DateTime         @updatedAt
}

model ProgrammeChapter {
  id            String     @id @default(cuid())
  programmeId   String
  programme     Programme  @relation(fields: [programmeId], references: [id])
  
  title         String
  description   String?
  order         Int
  
  objectives    String[]   // objectifs pédagogiques
  skills        String[]   // compétences ciblées
  
  systemPrompt  String?    @db.Text  // instructions André pour ce chapitre
}

model BacBlanc {
  id            String       @id @default(cuid())
  userId        String
  user          User         @relation(fields: [userId], references: [id])
  
  sessionNumber Int          // 1 à 6 dans l'année
  trimestre     Int          // 1, 2 ou 3
  
  niveau        Niveau
  subject       String       // "Contraction + Essai", "Commentaire", etc.
  sujetUrl      String?      // PDF du sujet
  copieUrl      String?      // PDF de la copie soumise
  
  status        BacBlancStatus @default(PENDING)
  
  correcteurId  String?
  correcteur    User?        @relation("Correcteur", fields: [correcteurId], references: [id])
  
  noteFinale    Float?
  noteDetails   Json?        // { contraction: 15, essai: 17, langue: 8 }
  commentaire   String?      @db.Text
  copieCorrigeeUrl String?
  
  submittedAt   DateTime?
  correctedAt   DateTime?
  createdAt     DateTime     @default(now())
}

enum BacBlancStatus {
  PENDING       // pas encore soumis
  SUBMITTED     // copie soumise, attente correcteur
  IN_REVIEW     // correcteur assigné, en cours
  CORRECTED     // correction terminée
}

model ApiConfig {
  id        String   @id @default(cuid())
  key       String   // "ANTHROPIC_API_KEY"
  value     String   // chiffré AES-256
  updatedAt DateTime @updatedAt
  updatedBy String   // userId admin
}
```

---

## FONCTIONNALITÉS DÉTAILLÉES

### 1. AUTHENTIFICATION

**Pages** : `/auth/login`, `/auth/register`, `/auth/forgot-password`

- Connexion email/password (hashé bcrypt, salt 12)
- OAuth Google + Apple (via NextAuth)
- JWT stocké en cookie httpOnly
- Middleware de protection sur `/app/*`, `/parent/*`, `/admin/*`
- Gestion des rôles : STUDENT, PARENT, CORRECTOR, ADMIN
- Email de confirmation à l'inscription (Resend)
- Reset password par email avec token 1h

**Formulaire inscription** :
```
Prénom | Nom | Email | Mot de passe
Vous êtes : Élève / Parent
Si Élève → niveau scolaire (select)
Si Parent → possibilité d'ajouter des enfants après
CGU + checkbox
```

---

### 2. ONBOARDING POST-INSCRIPTION

Route : `/onboarding`

**Étape 1 — Profil** (si élève) :
- Niveau scolaire
- Centres d'intérêt (max 5 tags) : Littérature, Sport, Musique, Jeux vidéo, Cinéma, Science, Voyage, etc.
- Profil particulier (optionnel) : Dyslexie, Dysorthographie, Dyscalculie, TDAH, HPI, Trouble anxieux

**Étape 2 — Plan** :
- Affichage des 3 plans (cf. section Plans)
- Redirection vers Stripe Checkout
- Après paiement : redirection `/app/dashboard`

**Étape 3 — Diagnostic initial** (dans le dashboard, première session) :
- 12 questions courtes posées par André
- Estimation durée : 8 minutes
- Génère un `errorProfile` initial (JSON avec pondérations par compétence)

---

### 3. PLANS & PAIEMENT STRIPE

**Essentiel — 9€/mois**
- André illimité
- Programme personnalisé
- Tableau de bord parent
- 2 bacs blancs/trimestre (correction humaine incluse)

**Standard — 17€/mois** ← Le plus choisi (badge)
- Tout Essentiel
- Rapport détaillé par email (hebdomadaire)
- Copie annotée téléchargeable
- 2 bacs blancs/trimestre + commentaires vocaux du correcteur
- Session de retour avec le correcteur (15 min)

**Intensif — 29€/mois**
- Tout Standard
- Bacs blancs à la demande (non limité aux 2/trimestre)
- Correcteur attitré toute l'année
- Accès prioritaire avant le bac (mai–juin)
- Session 30 min avec Aline ou Guillaume

**Intégration Stripe** :
- Créer les produits/prix dans Stripe Dashboard
- `stripeCustomerId` créé à l'inscription
- Checkout Session pour abonnement initial
- Customer Portal pour gestion (changement, résiliation)
- Webhooks : `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Mise à jour `Subscription` en BDD via webhook

**Composant PricingCard** (réutilisé sur landing + onboarding + settings) :
```tsx
interface PricingCardProps {
  plan: 'ESSENTIEL' | 'STANDARD' | 'INTENSIF'
  price: number
  featured?: boolean
  currentPlan?: boolean
  onSelect: () => void
}
```

---

### 4. CHAT AVEC ANDRÉ (cœur de l'application)

Route : `/app/andre`

#### Interface
- Layout 2 colonnes sur desktop : sidebar gauche (historique sessions) + zone chat principale
- Sur mobile : full width, sidebar accessible via swipe/bouton
- Topbar : avatar André (gradient bleu), statut "En ligne", niveau détecté, bouton "Nouvelle session"

#### Zone de chat
```
Messages alternés :
- André (gauche) : bg-soft, bordure bleue-dim, avatar "A"
- Élève (droite) : bg bleu-dim, bordure bleue
- Timestamps discrets
- Bulles avec markdown rendu (gras, italique, listes)
- Bloc "hint" : box bleue avec bordure gauche pour les indices d'André
```

#### Input bar
```
[📎 Joindre un fichier] [zone de texte multiline] [bouton envoyer →]
```

- Raccourci Cmd/Ctrl+Enter pour envoyer
- Shift+Enter pour saut de ligne
- Auto-resize du textarea
- Indicateur de frappe d'André (3 points animés)
- Streaming de la réponse (Server-Sent Events)

#### Upload de fichiers (Uploadthing)
Formats acceptés : JPG, PNG, PDF, DOCX
Taille max : 10 Mo
Affichage : miniature de l'image ou icône PDF + nom + poids
Analyse par André via vision Anthropic (images) ou extraction texte (PDF)

#### Logique André (API Route `/api/andre/chat`)

```typescript
// System prompt de base André
const ANDRE_SYSTEM_PROMPT = `
Tu es André, professeur de français IA de Studelio.
Ta méthode est socratique : tu ne donnes JAMAIS la réponse directement.
Tu guides l'élève par des questions successives pour qu'il trouve lui-même.
Tu t'adaptes au niveau ${studentProfile.niveau} et aux intérêts ${studentProfile.interests}.
${studentProfile.tags.includes('DYSLEXIE') ? 
  'Cet élève est dyslexique : utilise des phrases courtes, explique les sons avant les graphèmes.' : ''}
${currentChapter ? 
  `Tu travailles sur le chapitre : ${currentChapter.title}. ${currentChapter.systemPrompt}` : ''}

RÈGLES ABSOLUES :
1. Ne jamais rédiger une dissertation, un commentaire ou une rédaction complète
2. Ne jamais compléter un exercice à la place de l'élève
3. Toujours poser au moins une question avant de donner un indice
4. Si l'élève demande "fais-le pour moi" : refuser gentiment, expliquer pourquoi
5. Quand l'élève trouve la réponse : valoriser chaleureusement
6. Langue : français, naturel, adapté à l'âge. Tutoiement.
7. Réponses concises (max 150 mots sauf explication longue nécessaire)
`

// Appel API Anthropic avec streaming
const stream = await anthropic.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 1000,
  system: ANDRE_SYSTEM_PROMPT,
  messages: conversationHistory,  // incluant les fichiers joints en base64
})
```

- Chaque message est sauvegardé en BDD (ChatMessage)
- Token count sauvegardé par message
- Détection automatique de la matière (regex + premiers mots d'André)
- Après chaque session : mise à jour de `errorProfile` basée sur les erreurs détectées

---

### 5. PROGRAMME PERSONNALISÉ

Route : `/app/programme`

#### Interface
- Barre de progression globale (% du programme complété)
- Liste des chapitres avec statut (à faire / en cours / maîtrisé)
- Pour chaque chapitre : objectifs, compétences, bouton "Travailler ce chapitre avec André"
- Radar chart (recharts) : visualisation des compétences (Orthographe, Grammaire, Conjugaison, Syntaxe, Vocabulaire, Expression)

#### Logique
- `programme` lié au niveau de l'élève (géré dans le backoffice)
- André utilise `currentChapter.systemPrompt` pour cibler ses questions
- Mise à jour du statut des chapitres selon `errorProfile`

---

### 6. BACS BLANCS

Route : `/app/bac-blanc`

#### Liste des sessions
- Calendrier des 6 sessions de l'année (2 par trimestre)
- Statut par session : Terminé / Ouvert / Bientôt
- Compte à rebours pour la prochaine session
- Bouton "Soumettre ma copie" sur les sessions ouvertes

#### Soumettre une copie
1. Télécharger le sujet (PDF)
2. Composer dans les conditions réelles (minuteur affiché)
3. Scanner/photographier la copie → Uploadthing
4. Soumettre → status passe à SUBMITTED

#### Voir une correction
- Copie annotée (PDF viewer intégré ou lien téléchargement)
- Note finale avec détail par exercice (barres de progression)
- Commentaire du correcteur
- Note André : plan de travail mis à jour

---

### 7. TABLEAU DE BORD ÉLÈVE

Route : `/app/dashboard`

**Widgets** :
- Streak (jours consécutifs)
- Temps de travail cette semaine
- Prochaine session bac blanc (countdown)
- Radar chart des compétences (recharts)
- Dernière session André (résumé)
- Progression du programme (%)
- Dernière correction bac blanc (si disponible)

---

### 8. ESPACE PARENT

Route : `/parent/dashboard`

**Accès** :
- Un parent peut avoir N enfants liés
- Chaque enfant a un profil indépendant avec son abonnement

**Tableau de bord parent** :
- Sélecteur d'enfant (tabs si plusieurs)
- Streak + temps de travail de l'enfant
- Radar chart compétences
- Derniers bacs blancs + notes
- Rapport hebdomadaire (synthèse lisible, sans jargon)

**Notifications** :
- Email hebdomadaire automatique (lundi matin) via Resend
- Alerte si l'enfant n'a pas travaillé depuis 3 jours
- Notification quand une copie bac blanc est corrigée

---

### 9. BACKOFFICE ADMIN

Route : `/admin` — accessible uniquement aux utilisateurs avec `role: ADMIN`

#### 9.1 Configuration API Claude
Route : `/admin/api-keys`

```
Interface :
┌─────────────────────────────────────────────┐
│ Clé API Anthropic                           │
│ ┌─────────────────────────────────────────┐ │
│ │ sk-ant-••••••••••••••••••••••••••••     │ │
│ └─────────────────────────────────────────┘ │
│ [Modifier] [Tester la connexion]            │
│                                             │
│ Statut : ✅ Connexion active                │
│ Modèle utilisé : claude-sonnet-4-6         │
│ Tokens utilisés ce mois : 1 234 567         │
│ Coût estimé : 12,34 €                       │
└─────────────────────────────────────────────┘
```

- La clé est **chiffrée AES-256** avant stockage en BDD (`ApiConfig`)
- Jamais affichée en clair après le premier enregistrement
- Bouton "Tester la connexion" → appel API test
- Fallback sur variable d'environnement `ANTHROPIC_API_KEY` si pas de clé en BDD
- Log mensuel des tokens utilisés

#### 9.2 Programmes par niveau
Route : `/admin/programmes`

```
Interface :
- Onglets par niveau : 6ème | 5ème | 4ème | 3ème | 2nde | 1ère | Terminale | BTS
- Pour chaque niveau :
  - Liste des chapitres (drag & drop pour réordonner)
  - Bouton "+ Ajouter un chapitre"
  - Édition inline : titre, description, objectifs, compétences ciblées
  - Champ "Instructions André" (textarea) : prompt système spécifique à ce chapitre
  - Import/export JSON du programme complet
```

**Contenu pré-chargé (Éducation Nationale)** — à implémenter pour chaque niveau :

> **IMPORTANT** : Ces programmes doivent être pré-chargés en BDD via un seed Prisma.
> Source de référence : Bulletins Officiels du Ministère de l'Éducation Nationale.

```
6ème :
- Grammaire : la phrase, les types et formes de phrases, les classes de mots, les fonctions
- Orthographe : accord sujet-verbe, accord adjectif, homophones grammaticaux
- Conjugaison : présent, imparfait, futur, passé composé (verbes du 1er groupe)
- Lecture : textes narratifs (récit d'aventures, mythologie)
- Expression écrite : raconter, décrire (50-80 mots)
- Vocabulaire : familles de mots, préfixes/suffixes

5ème :
- Grammaire : propositions subordonnées relatives et conjonctives, compléments circonstanciels
- Orthographe : accord du participe passé (avoir/être), tout/tous
- Conjugaison : conditionnel, subjonctif présent, plus-que-parfait
- Lecture : récit médiéval, texte autobiographique
- Expression écrite : décrire un personnage, narration à la 1ère personne (100-120 mots)

4ème :
- Grammaire : discours indirect, valeurs des temps, ponctuation
- Orthographe : verbes en -eler/-eter, -yer, accord des adjectifs de couleur
- Conjugaison : passé simple, tous les modes
- Lecture : roman réaliste (XIX°), poésie romantique
- Expression écrite : portrait, argumentation simple (150 mots)

3ème :
- Grammaire : révision complète, analyse logique
- Orthographe : révision bac de brevet
- Conjugaison : révision tous temps
- Lecture : roman engagé, théâtre classique
- Expression écrite : texte argumentatif (200-250 mots), commentaire simple
- Préparation Brevet : contraction, rédaction, questions de compréhension

2nde :
- Grammaire : les fonctions de la proposition, subordination
- Stylistique : figures de style (métaphore, comparaison, hyperbole, antithèse...)
- Lecture : texte humaniste (XVI°), tragédie classique, poésie baroque
- Expression écrite : paragraphe argumenté, début de commentaire composé

1ère :
- Objets d'étude : roman/récit, poésie, théâtre, littérature d'idées
- Commentaire composé : méthode complète, introduction, axes, conclusion
- Dissertation : méthode, problématique, plan dialectique/thématique
- Contraction de texte : méthode officielle (bac)
- Essai critique (BTS prep si applicable)

Terminale :
- Révision objets d'étude Première + approfondissement
- Contraction + Essai : entraînement intensif (format bac)
- Commentaire de texte : maîtrise de la rédaction en temps limité
- Dissertation : fluidité, exemples, transitions
- Oral du bac : présentation d'un extrait, entretien
- Parcours associés aux œuvres au programme

BTS :
- Contraction de texte BTS : spécificités du format (1/4 du texte, objectivité)
- Synthèse de documents : méthode, reformulation, connexion entre sources
- Essai BTS : argumentation structurée, registre professionnel
- Expression orale : exposé, discussion, argumentation
```

#### 9.3 Gestion des bacs blancs
Route : `/admin/bacs-blancs`

- Créer/configurer les sessions de l'année (date, niveau, type d'exercice)
- Voir toutes les copies soumises par statut
- Assigner un correcteur à une copie
- Accès correcteur : voir la copie, uploader la correction, saisir la note

#### 9.4 Gestion des utilisateurs
Route : `/admin/utilisateurs`

- Liste avec filtres (rôle, plan, niveau, date d'inscription)
- Profil détaillé d'un utilisateur
- Changer le rôle (STUDENT → CORRECTOR, etc.)
- Suspendre un compte
- Voir les sessions André (sans le contenu, juste métadonnées)

#### 9.5 Abonnements
Route : `/admin/abonnements`

- Vue tableau : utilisateur, plan, statut, prochaine échéance, MRR
- Statistiques : MRR total, ARR, churn rate
- Lien direct vers Customer Portal Stripe

---

### 10. PARAMÈTRES UTILISATEUR

Route : `/app/settings`

```
Tabs :
├── Mon compte     : email, mot de passe, suppression RGPD
├── Mon profil     : niveau, centres d'intérêt, tags DYS/TDAH
├── Apparence      : toggle mode sombre/clair, police (DM Sans / accessible)
├── Abonnement     : plan actuel, date renouvellement, changer/résilier → Stripe Portal
├── Notifications  : fréquence rapports parent, alertes
└── Accessibilité  : police Opendyslexic (si tag DYSLEXIE), espacement, taille texte
```

---

## COMPOSANTS RÉUTILISABLES

```tsx
// Tous dans /components/ui/ (shadcn) + /components/studelio/

<AndreAvatar size="sm|md|lg" online={boolean} />
<ChatBubble role="andre|user" content={string} timestamp={Date} />
<HintBox content={string} />                          // indice bleu bordure gauche
<PlanBadge plan="ESSENTIEL|STANDARD|INTENSIF" />
<NiveauBadge niveau={Niveau} />
<TagBadge tag={Tag} />                                // DYS, TDAH, etc.
<StreakCounter days={number} />
<CompetenceRadar data={errorProfile} />               // recharts
<ProgressBar value={number} label={string} color="blue|green|red" />
<BacBlancCard session={BacBlanc} />
<UploadZone onUpload={fn} accept="image/*,application/pdf" />
<ThemeToggle />                                       // dark/light switch
<PricingCard plan={Plan} featured={boolean} />
```

---

## SÉCURITÉ

- Middleware Next.js sur toutes les routes `/app/*`, `/parent/*`, `/admin/*`
- Vérification de rôle côté serveur sur chaque Server Action / API Route
- Clé API Claude chiffrée en BDD (jamais en clair dans les logs)
- Rate limiting sur `/api/andre/chat` : 50 messages/heure/utilisateur (Upstash Redis)
- Validation Zod sur tous les inputs (Server Actions + API Routes)
- Headers de sécurité : CSP, HSTS, X-Frame-Options (next.config.js)
- RGPD : endpoint `/api/user/export` et `/api/user/delete` (72h délai, email confirmation)

---

## STRUCTURE DES FICHIERS

```
studelio/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              ← sidebar + header app
│   │   ├── dashboard/page.tsx
│   │   ├── andre/page.tsx          ← chat principal
│   │   ├── programme/page.tsx
│   │   ├── bac-blanc/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── profil/page.tsx
│   │   └── settings/page.tsx
│   ├── (parent)/
│   │   ├── layout.tsx
│   │   └── dashboard/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── api-keys/page.tsx
│   │   ├── programmes/page.tsx
│   │   ├── bacs-blancs/page.tsx
│   │   └── utilisateurs/page.tsx
│   ├── onboarding/
│   │   ├── page.tsx
│   │   └── plan/page.tsx
│   └── api/
│       ├── andre/chat/route.ts     ← streaming SSE
│       ├── stripe/webhook/route.ts
│       ├── uploadthing/core.ts
│       └── auth/[...nextauth]/route.ts
├── components/
│   ├── ui/                         ← shadcn components
│   └── studelio/                   ← composants métier
├── lib/
│   ├── auth.ts                     ← NextAuth config
│   ├── prisma.ts                   ← client Prisma singleton
│   ├── stripe.ts                   ← client Stripe
│   ├── anthropic.ts                ← client Anthropic (lit clé BDD ou env)
│   ├── uploadthing.ts
│   └── andre-prompts.ts            ← system prompts par niveau/chapitre
├── actions/
│   ├── auth.ts                     ← login, register, logout
│   ├── student.ts                  ← updateProfile, updateInterests
│   ├── subscription.ts             ← createCheckout, createPortal
│   ├── bac-blanc.ts                ← submit, getResults
│   └── admin.ts                    ← updateApiKey, updateProgramme
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     ← programmes EN pré-chargés
├── middleware.ts                   ← protection routes + rôles
└── next.config.js
```

---

## VARIABLES D'ENVIRONNEMENT

```env
# Base
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ESSENTIEL=
STRIPE_PRICE_STANDARD=
STRIPE_PRICE_INTENSIF=

# Anthropic (fallback si pas de clé en BDD)
ANTHROPIC_API_KEY=

# Uploadthing
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=

# Resend (emails)
RESEND_API_KEY=

# Chiffrement clés API
ENCRYPTION_KEY=  # 32 bytes hex pour AES-256

# Rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## ORDRE DE DÉVELOPPEMENT RECOMMANDÉ

```
Phase 1 — Fondations
  1. Setup Next.js 14 + Prisma + PostgreSQL + Tailwind + shadcn
  2. Schema Prisma complet + migrations + seed programmes
  3. NextAuth (credentials + Google) + middleware de protection
  4. Design system : CSS variables light/dark, composants de base

Phase 2 — Authentification & Onboarding
  5. Pages login / register / forgot-password
  6. Onboarding (profil élève + sélection plan)
  7. Intégration Stripe (checkout + webhooks + portal)

Phase 3 — Cœur produit (André)
  8. Chat André avec streaming (API Route SSE)
  9. Upload fichiers (Uploadthing + vision Anthropic)
  10. Sauvegarde sessions en BDD

Phase 4 — Dashboard & Programme
  11. Dashboard élève (widgets + recharts)
  12. Programme personnalisé (chapitres + progression)
  13. Espace parent + notifications email (Resend)

Phase 5 — Bacs blancs
  14. Calendrier sessions + submission copie
  15. Interface correcteur (correction + upload)
  16. Vue résultats élève

Phase 6 — Backoffice
  17. Layout admin + dashboard
  18. Configuration clé API Claude
  19. Gestion programmes par niveau
  20. Gestion utilisateurs + abonnements

Phase 7 — Polish
  21. Mode sombre complet
  22. Accessibilité (dyslexie, taille texte)
  23. Tests (Jest + Playwright)
  24. Optimisations performances (ISR, Edge)
```

---

## NOTES IMPORTANTES POUR CURSOR

1. **Ne pas créer de mock data** — utiliser Prisma avec une vraie base PostgreSQL dès le départ
2. **Le streaming André est critique** — utiliser `ReadableStream` + `TextEncoder` pour les SSE, pas de simulacre
3. **La clé API Anthropic** doit d'abord être lue dans `ApiConfig` (BDD), puis fallback sur `process.env.ANTHROPIC_API_KEY`
4. **Les programmes EN** doivent être dans le seed Prisma, pas en dur dans le code
5. **Chaque Server Action** doit vérifier l'authentification et le rôle avant d'exécuter
6. **Le mode sombre** se stocke dans localStorage ET un cookie (pour SSR sans flash)
7. **Stripe webhooks** : toujours vérifier la signature avec `stripe.webhooks.constructEvent`
8. **Ne jamais logger** la clé API Anthropic, même partiellement
9. **Rate limiting** sur `/api/andre/chat` est obligatoire dès la Phase 3
10. **RGPD** : endpoint de suppression de compte opérationnel avant le lancement
```

---

## EXPÉRIENCE UTILISATEUR — INTERFACE IMMERSIVE & ADDICTIVE

> **Directive design prioritaire** : L'interface doit être **aussi engageante qu'une application de jeu**. Un élève de 13 ans doit avoir envie de revenir chaque soir. Chaque interaction doit procurer une micro-satisfaction. On s'inspire des mécaniques de rétention de Duolingo, Notion et les meilleurs jeux mobiles — appliquées à l'éducation.

---

### PRINCIPES FONDAMENTAUX D'ENGAGEMENT

**1. Feedback instantané et satisfaisant**
- Chaque message envoyé à André → animation d'envoi (bulle qui "part")
- Chaque bonne réponse détectée → confetti discret + son optionnel + message valorisant d'André
- Chaque chapitre terminé → animation de complétion (cercle qui se ferme, étoile qui apparaît)
- Chaque connexion → animation de bienvenue personnalisée ("Bonsoir Lucas, tu as travaillé 4 jours d'affilée 🔥")

**2. Progression visible en permanence**
- Barre de progression du programme toujours visible dans la sidebar (jamais cachée)
- XP points gagnés après chaque session (système invisible mais affiché comme "Points André")
- Niveau de maîtrise par compétence qui monte en temps réel après chaque session
- Animations de "level up" quand une compétence progresse d'un palier

**3. Streak — la mécanique la plus addictive**
- Compteur de streak visible dans la topbar en permanence (flamme 🔥 + nombre de jours)
- Alerte douce si l'élève n'a pas travaillé aujourd'hui (notification push + email)
- "Streak shield" : 1 jour de grâce par semaine pour ne pas briser la série (comme Duolingo)
- Animation spéciale quand on bat son record personnel de streak
- Sur le dashboard : calendrier de présence type GitHub (carreaux verts)

---

### CHAT AVEC ANDRÉ — IMMERSION MAXIMALE

**Personnalité d'André dans l'UI**
- André a des "états" visuels : pensif (3 points animés), enthousiaste (avatar qui pulse légèrement), concentré
- Quand André valide une bonne réponse : l'avatar clignote brièvement en vert + message court et chaleureux
- Quand André pose une question difficile : l'avatar prend une teinte légèrement différente
- Temps de "réflexion" simulé avant les réponses longues (0.5s de délai + indicateur) pour humaniser

**Animations des messages**
- Les bulles d'André apparaissent mot par mot (streaming visible) — jamais d'un bloc
- Les bulles de l'élève partent avec une animation de glissement vers la droite
- Les blocs "hint" (indices) s'ouvrent avec une animation d'accordéon
- Scroll automatique fluide vers le bas à chaque nouveau message

**Son (optionnel, activable dans les settings)**
- Son subtil à l'envoi d'un message (clic doux)
- Son de validation quand André dit "exactement" ou "bravo" (petit "ding" satisfaisant)
- Son de notification pour les nouveaux messages André quand l'onglet est en arrière-plan

**Mode "Focus"**
- Bouton dans le chat : passer en mode plein écran avec fond épuré
- Minuteur Pomodoro optionnel (25 min de travail, 5 min de pause) affiché discrètement
- En mode focus : sidebar masquée, topbar réduite, seul André existe

---

### GAMIFICATION SUBTILE (jamais infantile)

**Système de badges** (discrets, dans le profil)
```
🔥 Flamme persistante  → 7 jours de suite
⚡ Électrique          → 3 sessions dans la même journée
🎯 Tireur d'élite      → 10/10 à un exercice André
📖 Lecteur assidu      → 5 chapitres terminés
🏆 Champion de la dictée → 3 dictées sans faute d'affilée
🌙 Hibou               → Session après 22h
🌅 Lève-tôt            → Session avant 8h
💎 Diamant             → 30 jours de streak
```
- Badges affichés discrètement sur le profil (jamais poussés en avant de façon agressive)
- Notification toast subtile quand un badge est débloqué : "Nouveau badge : Flamme persistante 🔥"

**Points André (XP)**
- Chaque message envoyé = +1 pt
- Chaque bonne réponse validée par André = +10 pts
- Chaque chapitre complété = +100 pts
- Chaque bac blanc soumis = +500 pts
- Barre d'XP visible dans le profil (pas dans le chat pour ne pas distraire)
- Classement optionnel (peut être désactivé dans les settings)

**Objectifs hebdomadaires**
- 3 objectifs auto-générés chaque lundi : "Faire 3 sessions cette semaine", "Travailler la conjugaison", "Soumettre un bac blanc"
- Barre de progression de chaque objectif
- Récompense à la complétion : +XP bonus + badge temporaire

---

### ANIMATIONS & MICRO-INTERACTIONS (implémentation Framer Motion)

```tsx
// Installer : npm install framer-motion

// Exemple : bulle de chat qui apparaît
<motion.div
  initial={{ opacity: 0, y: 10, scale: 0.97 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
>
  <ChatBubble ... />
</motion.div>

// Exemple : barre de progression
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${percentage}%` }}
  transition={{ duration: 0.8, ease: "easeOut" }}
/>

// Exemple : streak counter qui pulse
<motion.div
  animate={{ scale: [1, 1.15, 1] }}
  transition={{ duration: 0.4, ease: "easeInOut" }}
  key={streakDays}  // re-trigger à chaque update
>
  🔥 {streakDays}
</motion.div>

// Exemple : confetti sur bonne réponse
// Utiliser : npm install canvas-confetti
import confetti from 'canvas-confetti'
confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, colors: ['#2451b0', '#4ADE80', '#f59e0b'] })
```

**Transitions de pages** : fade + légère translation vers le haut (100ms) à chaque navigation

**Hover states soignés** :
- Cards : légère élévation (translateY -3px) + ombre plus prononcée
- Boutons : micro-scale (1.02) + changement de couleur
- Liens de navigation sidebar : glissement d'un indicateur bleu à gauche

**Loading states** :
- Skeleton loaders sur toutes les données asynchrones (jamais de spinner seul)
- Le skeleton doit avoir la même forme que le contenu final
- Shimmer animation sur les skeletons (fond qui passe de gauche à droite)

---

### SIDEBAR & NAVIGATION — CONFORT MAX

**Sidebar élève**
```
┌─────────────────────┐
│ 🔥 14  [Lucas D.]   │  ← streak + prénom toujours visible
│─────────────────────│
│ ◉ André             │  ← chat (point vert "en ligne")
│ ▦ Programme  ██░░ 42%│  ← mini barre de progression inline
│ 📄 Bac blanc  ← dans 12j│
│ 📊 Dashboard        │
│─────────────────────│
│ Prochaine session   │
│ ┌─────────────────┐ │
│ │ Bac Blanc #4    │ │
│ │ Dans 12 jours   │ │  ← mini countdown
│ └─────────────────┘ │
│─────────────────────│
│ ⚙️ Paramètres       │
│ 🌙 Mode sombre      │  ← toggle inline
└─────────────────────┘
```

- La sidebar mémorise son état ouvert/fermé (localStorage)
- Sur mobile : bottom navigation bar (4 items) + bouton André central proéminent
- Indicateur de notifications sur les items concernés (point rouge discret)

---

### DASHBOARD — "TON UNIVERS"

Le dashboard ne doit pas ressembler à un tableau de bord administratif. Il doit ressembler à **l'écran d'accueil d'un jeu de rôle éducatif**.

**Hero du dashboard**
```
Bonsoir, Lucas 👋
Tu as travaillé 14 jours d'affilée. André est fier.

[Continuer où tu t'es arrêté →]   ← CTA principal, toujours présent
```

**Widget Streak** : grande flamme animée, compte les jours, message personnalisé selon la valeur
- 1-3 jours : "Tu démarres bien !"
- 7 jours : "Une semaine ! Tu es dans le rythme."
- 14 jours : "André commence à te connaître vraiment."
- 30 jours : "Tu es exceptionnel. Vraiment."

**Widget Compétences** : radar chart animé (recharts) qui "se dessine" à l'ouverture de la page

**Widget Programme** : visualisation du chemin parcouru style "map de jeu" avec étapes et progression

**Widget André** : petite citation d'André du jour (générée via API, 1 appel/jour/user, mis en cache)

---

### NOTIFICATIONS & RÉTENTION

**Push notifications** (web push API)
- "Tu n'as pas travaillé aujourd'hui — André t'attend" (après 20h si pas de session)
- "Ton bac blanc #4 a été corrigé ! Tu as eu 15/20 🎉"
- "Plus que 3 jours avant le Bac Blanc #5 — tu es prêt ?"

**Emails de rétention** (Resend, séquence automatisée)
- J+1 sans connexion : "André a préparé quelque chose pour toi"
- J+3 sans connexion : email parent + email élève
- J+7 sans connexion : "Ta série de X jours est en danger"

**Toast notifications** dans l'app (top-right, auto-dismiss 4s)
- Succès : fond vert-dim, icône check, message court
- Badge débloqué : fond bleu-dim, icône badge, prénom + nom du badge
- Rappel : fond neutre, icône horloge
- Erreur : fond rouge-dim, icône X

---

### ACCESSIBILITÉ ÉMOTIONNELLE

- **André ne juge jamais** — son interface non plus. Pas de croix rouge sur les erreurs, mais des annotations douces ("presque !", "bonne direction")
- **Progression visible même les mauvais jours** — même +1pt est valorisé
- **Interface qui "respire"** : spacing généreux, pas de surcharge cognitive
- **Dark mode parfait** : pas juste une inversion, un vrai thème pensé pour les sessions du soir (moins de lumière bleue, températures de couleur adaptées)
- Pour les profils **DYS** : option Opendyslexic dans les settings, espacement entre les lettres augmenté, police plus grande, fond légèrement crème plutôt que blanc pur (`#FAFAF5`)

---

### RÉFÉRENCES D'INSPIRATION

S'inspirer de (sans copier) :
- **Duolingo** : streak, gamification, feedback immédiat, personnage
- **Linear** : fluidité des animations, micro-interactions, shortcuts
- **Notion** : sidebar propre, organisation, confort de lecture
- **Wordle** : satisfaction d'un seul objectif quotidien bien exécuté
- **BeReal** : sentiment de "il faut que j'y aille maintenant"
- **Chess.com** : immersion totale, design sombre confortable, sentiment de progression

> L'objectif : un élève qui ouvre Studelio pour 10 minutes et qui se retrouve à travailler 40 minutes sans s'en rendre compte. Pas par manipulation — par intérêt sincère et satisfaction du progrès.
