# Food Tracker — suivi alimentaire multi-utilisateur

Application de suivi alimentaire : journal des repas, objectifs nutritionnels,
hydratation, catalogue personnel d'aliments (Open Food Facts) et enregistrement
de bilans sanguins. Multi-utilisateurs, données privées par compte.

Interface en français. Construite avec **Next.js 16** (App Router), **React 19**,
**TypeScript**, **Tailwind CSS v4**, **Drizzle ORM** + **SQLite**, **Auth.js v5**.

---

## Fonctionnalités

| Module | Description |
|---|---|
| **Comptes** | Inscription ouverte (`/register`), connexion (`/login`), sessions JWT. Chaque compte a son propre catalogue, journal, objectifs et bilans. |
| **Journal du jour** (`/`) | Ajouter un repas (aliment, quantité en g, repas, heure, note), modifier/supprimer les entrées, total du jour (kcal, P/G/L). |
| **Tableau de bord** (`/dashboard`) | Totaux du jour, **donut des macronutriments** du jour, tendance calories sur 30 jours, objectifs du jour, eau, statistiques du catalogue. |
| **Aliments** (`/foods`) | Recherche Open Food Facts (texte ou scan code-barres), ajout manuel (valeurs pour 100 g) en fenêtre modale, catalogue personnel. |
| **Historique** (`/history`) | Parcours jour par jour (`?day=YYYY-MM-DD`) avec les totaux et les entrées. |
| **Profil & objectifs** (`/profile`) | Sexe, naissance, taille, poids, activité, mode d'objectif (perte/maintien/prise). Calcul automatique (kcal via Mifflin-St Jeor, macros) avec surcharge manuelle possible. Eau : 8 verres/jour. |
| **Analyses médicales** (`/analyses`) | Saisie d'un bilan sanguin par date en fenêtre modale, valeurs de référence du labo saisies avec le bilan, statut calculé (dans la norme / à surveiller / hors norme). 13 analyses pré-remplies (glycémie, HbA1c, cholestérol, HDL/LDL, triglycérides, ferritine, ASAT/ALAT, urée, créatinine, CRP, vitamine D). |

---

## Prérequis

- **Node.js ≥ 20.9** (testé avec v22)
- npm (fourni avec Node)

## Installation et démarrage

```bash
npm install
```

### 1. Fichier d'environnement

Créez un fichier `.env.local` à la racine (modèle : `.env.example`) :

```bash
# Obligatoire — secret de signature des JWT de session
# Générer : node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_SECRET=

# Facultatif — emplacement de la base SQLite (défaut : ./data/app.db)
# DATABASE_PATH=./data/app.db
```

> Les variables `AUTH_USER_EMAIL` / `AUTH_USER_PASSWORD_HASH` (voir `.env.example`)
> sont **obsolètes** et ne servent qu'à la migration d'un ancien compte de transfert.
> Les nouveaux comptes se créent depuis `/register`. Si un hash est fourni, chaque
> `$` doit être écrit `\$` (le tooling d'environnement de Next.js interprète `$VAR`).

### 2. Migrations de la base

```bash
npx drizzle-kit migrate
```

> Le dossier `data/` est créé automatiquement à l'import. Pour une base vierge,
> créez-le avant la migration si la commande échoue : `mkdir data`.

### 3. Lancer l'application

```bash
npm run dev        # développement (Turbopack, ~ http://localhost:3000)
npm run build      # build de production (Turbopack)
npm run start      # serveur de production après build
```

Ouvrez l'URL affichée, puis inscrivez-vous sur `/register` pour créer votre compte.

---

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | Lint ESLint (config plate v9) |
| `npm run typecheck` | _n'existe pas_ — utiliser `npx tsc --noEmit` |
| `npx drizzle-kit migrate` | Appliquer les migrations SQLite |
| `npx drizzle-kit generate --custom --name <x>` | Générer une migration à la main (voir plus bas) |

---

## Architecture

### Routes

| Route | Page |
|---|---|
| `/` | Journal du jour |
| `/dashboard` | Tableau de bord |
| `/foods` | Catalogue et recherche d'aliments |
| `/history` | Historique par jour |
| `/profile` | Profil et objectifs |
| `/analyses` | Bilans sanguins |
| `/login`, `/register` | Connexion, inscription (publiques) |

### Structure

```
src/
  app/              Pages (App Router), actions serveur, route API
    api/foods/      Endpoints recherche + code-barres (Open Food Facts)
  components/       Interface (client et serveur)
  lib/
    dal.ts          Data Access Layer (server-only) — SEULE porte d'accès aux données
    goals.ts        Calculs objectifs (pur, réutilisable côté client)
    lab.ts          Catalogue + statuts des analyses sanguines (pur)
    foods.ts        Import idempotent d'aliments (server-only)
    openfoodfacts.ts Client Open Food Facts (server-only)
    date.ts         Clés de jour locales
    email.ts        Normalisation des emails
  db/
    schema.ts       Schéma Drizzle
    index.ts        Client SQLite + migration du compte hérité
  auth.ts           Configuration Auth.js
  proxy.ts          Garde d'authentification (ex-middleware)
drizzle/            Migrations + snapshots
data/app.db         Base SQLite (gitignorée)
```

### Données (SQLite via better-sqlite3)

- **Toutes les tables** portent le `userId` et se suppriment en cascade avec le compte.
- `foods` : valeurs nutritionnelles **pour 100 g**.
- `entries` : repas consommés (`quantityG`, `mealType`, `eatenAt` ISO + `eatenOn`
  local pour regrouper les jours sans décalage de fuseau).
- `profiles` : un profil par utilisateur, `userId` en clé primaire. Objectifs
  `NULL` = laisser la formule calculer.
- `water_logs` : compteur **de verres** (250 ml), clé `(userId, dayKey)`.
- `blood_results` : une ligne par analyte (valeur, unité, bornes du labo — la
  borne absente est `NULL`, pas `0`).

### API

- `/api/auth/*` — Auth.js (credentials).
- `GET /api/foods/search?q=…` — catalogue local + Open Food Facts (retourne 200
  avec un champ `warning` si OFF est injoignable : la page dégrade sans casser).
- `GET /api/foods/barcode/:code` — produit OFF par EAN.

Les chemins `/api/*` ne sont pas filtrés par `proxy.ts` : chaque route handler
appelle `auth()` elle-même.

### Sécurité et règles métier

- Toute lecture/écriture passe par `src/lib/dal.ts` (marqué `server-only`), qui
  vérifie la session. Ne jamais lire les données hors de cette couche.
- `currentUserId()` lance une erreur plutôt que de renvoyer une valeur fausse :
  un filtre silencieusement supprimé ferait lire à un compte les données d'un autre.
- Les emails sont normalisés (`normalizeEmail`) avant la recherche unique et
  l'inscription, pour éviter `A@x.fr` ≠ `a@x.fr`.
- `entries.userId` est redondant avec `foods.userId` : la propriété de l'aliment
  est vérifiable sans jointure.

### Bilan sanguin — statuts

`labStatus` compare la valeur aux bornes **inclusives** : une valeur pile sur la
borne est « dans la norme ». La bande « à surveiller » (10 % de l'intervalle) ne
s'applique qu'aux références à deux bornes ; pour les références à une seule
borne (HDL > 0,4 ; LDL < 1,6 ; triglycérides < 1,5), il n'y a que
normal/sous/au-dessus. Sans borne publiée par le labo → statut « inconnu ».
Ce n'est pas un avis médical.

---

## Guide d'utilisation

### Démarrage

1. Ouvrez le site et cliquez **« Nouveau utilisateur »** (`/register`), ou
   connectez-vous sur `/login`.
2. Allez dans **Profil** et renseignez votre sexe, année de naissance, taille,
   poids et activité (pertinence). Les objectifs journaliers sont alors calculés
   automatiquement — vous pouvez les surcharger manuellement si besoin.

### Journal du jour (`/`)

- Choisissez un aliment du catalogue, la quantité en grammes, le repas et l'heure,
  puis **« Ajouter »**.
- Chaque entrée affiche sa contribution kcal / protéines / glucides / lipides ;
  la corbeille supprime l'entrée.
- En haut : vos totaux du jour et l'atteinte de vos objectifs.

### Ajouter des aliments (`/foods`)

- **Recherche** : tapez un nom ou un code-barres (recherche locale + Open Food
  Facts), ou **« Scanner un code-barres »** (caméra en Chromium ; sinon saisissez
  le code à la main).
- **Ajout manuel** : cliquez **« Ajouter un aliment »** → une fenêtre modale
  s'ouvre. N'oubliez pas : les valeurs sont **pour 100 g**.
- Les produits apparaissent dans **« Mon catalogue »** et sont utilisables
  partout. Un produit importé deux fois est un seul aliment (import idempotent).

### Tableau de bord (`/dashboard`)

- Le **donut des macronutriments** montre la part d'énergie (kcal, 4/4/9 par g)
  apportée par les protéines, glucides et lipides aujourd'hui.
- **Calories (30 jours)** trace votre apport quotidien avec la ligne pointillée
  de l'objectif. Seuls les jours avec au moins une entrée sont représentés.

### Hydratation

Dans le tableau de bord ou le journal : boutons **−** / **+ 1 verre**. L'objectif
est fixé à 8 verres (2 L). Les pastilles indiquent la progression.

### Analyses médicales (`/analyses`)

1. Cliquez **« Ajouter un bilan »** → la fenêtre modale s'ouvre.
2. Choisissez la **date du prélèvement**.
3. Renseignez les **valeurs** que vous voulez ; les bornes de référence du labo
   sont pré-remplies avec les valeurs par défaut et modifiables. Laissez vide une
   borne absente de votre feuille de résultats.
4. Validez : le bilan s'affiche dans **« Mes bilans »** avec le statut de chaque
   valeur (Dans la norme / À surveiller / Sous la norme / Au-dessus de la norme).
5. Ré-enregistrer la même date **remplace** le bilan de cette date ; la poubelle
   supprime tout le bilan d'une date.

> Le statut est une comparaison mécanique aux bornes que *vous* avez saisies :
> ce n'est pas un diagnostic. Parlez de vos résultats à un professionnel de santé.

---

## Développement

### Migrations SQLite (mise en garde)

`drizzle-kit generate` exige un terminal interactif dès qu'une migration ajoute
une colonne. Utilisez :

```bash
npx drizzle-kit generate --custom --name <etiquette>
```

Puis écrivez le SQL à la main. Règles qui dictent l'ordre des reconstructions
(voir les fichiers `drizzle/` pour les exemples déjà écrits) :

- `DROP TABLE <parent>` fait un `DELETE` implicite : les tables enfants sont
  nettoyées par la cascade. Reconstruisez d'abord les enfants.
- `PRAGMA foreign_keys` est ignoré *à l'intérieur* d'une transaction : utilisez
  `PRAGMA legacy_alter_table=ON` pour rendre le « rename puis recreate » légal.
- Après une migration écrite à la main, le snapshot `drizzle/meta/` n'est pas
  mis à jour : vérifiez qu'un `generate` ultérieur ne détecte aucun changement.

### Validation

```bash
npx tsc --noEmit   # typecheck
npm run lint       # ESLint (ne fait PAS échouer next build sur les versions ≥ 16)
```

> Test et typecheck n'ont pas de script npm dédié : pas de test runner dans le
> projet pour l'instant.

### Points d'attention spécifiques à cette version

- **`next build` ne lance plus le lint** : exécutez `npm run lint` avant de
  déclarer le travail terminé.
- Les **API de requête sont asynchrones** : `const { slug } = await params`.
- Le garde d'authentification s'appelle **`proxy.ts`** (export par défaut), pas
  `middleware.ts`.
- `revalidateTag` demande un 2ᵉ argument (profil de cache) ; pour une relecture
  immédiate dans une action serveur, utiliser `updateTag(tag)`.
- `trustHost: true` dans `src/auth.ts` est **requis** pour la connexion hors
  `next dev` (Auth.js ne peut pas vérifier le header `Host` en auto-hébergé).

---

## Déploiement

Application Node.js standard (Next.js). Build puis démarrage :

```bash
npm run build
npm run start
```

Les données vivent dans `data/app.db` (SQLite, gitignorée) : il faut un disque
persistant entre les redémarrages sur la plateforme d'hébergement, et définir
`AUTH_SECRET` (et éventuellement `DATABASE_PATH`). Les comptes se créent via
`/register` ; aucune protection par domaine n'est configurée, la base est
accessible à toute personne qui rejoint l'instance.