# Archi Drive – Documentation de l’application

## 1. Présentation générale

Archi Drive est une application web de gestion et de partage documentaire multi‑entreprises. Elle permet à différentes sociétés de centraliser leurs documents, de les organiser dans des espaces structurés et de contrôler finement les droits d’accès selon le rôle des utilisateurs.

L’interface est moderne, responsive et pensée pour un usage quotidien en contexte professionnel (agents, administrateurs d’entreprise, super administrateurs).

## 2. Rôles et espaces fonctionnels

L’application repose sur un système d’authentification et de rôles. Les principaux espaces sont :

- **Espace de connexion (`/login`)**  
  Accès à l’application via identifiants. Redirection automatique depuis la racine `/` vers `/login`.

- **Espace Agent (`/agent`)**  
  Interface principale de navigation dans les dossiers et documents.
  - Consultation des dossiers et sous‑dossiers de l’entreprise.
  - Accès aux documents selon les droits affectés.
  - Actions courantes (affichage, téléchargement, etc. selon ce qui est implémenté dans l’interface `Index`).

- **Espace Administrateur d’entreprise (`/admin`)**  
  Destiné aux administrateurs internes d’une société.
  - Gestion de la structure documentaire (dossiers, catégories, etc.).
  - Gestion des utilisateurs de l’entreprise et de leurs rôles (agents / admins).
  - Suivi d’activité et paramétrages avancés (selon les fonctionnalités du `AdminDashboard`).

- **Espace Super Administrateur (`/super-admin`)**  
  Espace de gestion multi‑tenants.
  - Gestion des entreprises clientes (tenants).
  - Supervision globale de la plateforme.
  - Paramétrage des politiques globales de sécurité et d’accès (via `SuperAdminDashboard`).

- **Espace Profil (`/profile`)**  
  Accessible aux utilisateurs authentifiés (agents, admins, super admins).
  - Consultation et modification des informations personnelles.
  - Gestion éventuelle du mot de passe / préférences.

## 3. Fonctionnalités clés

- Authentification et gestion des rôles (agent, admin, super admin).
- Accès sécurisé aux différentes zones de l’application via `ProtectedRoute`.
- Navigation dans une arborescence de dossiers et documents pour les agents.
- Gestion des utilisateurs et de la structure documentaire pour les administrateurs.
- Gestion multi‑entreprises (tenants) pour le super administrateur.
- Notifications/toasts pour les retours utilisateurs.

## 4. Stack technique

L’application est construite avec :

- **Vite** (outillage et bundler)
- **React** + **TypeScript**
- **react-router-dom** pour la navigation côté client
- **@tanstack/react-query** pour la gestion des requêtes et du cache
- **shadcn‑ui** et **Radix UI** pour les composants UI
- **Tailwind CSS** pour le stylage

## 5. Structure principale du projet

- `index.html`  
  Point d’entrée HTML. Monte le composant racine React dans `#root` et charge `src/main.tsx`.

- `src/main.tsx`  
  Monte le composant `App` dans le DOM et initialise l’application.

- `src/App.tsx`  
  Contient la configuration principale :
  - Providers globaux : `QueryClientProvider`, `TooltipProvider`, `AuthProvider`.
  - Configuration du router (`BrowserRouter`, `Routes`, `Route`).
  - Définition des routes : `/login`, `/agent`, `/admin`, `/super-admin`, `/profile`, `*`.
  - Gestion de la protection des routes via `ProtectedRoute` et les rôles autorisés.

- `src/pages/`  
  - `Login.tsx` : page de connexion.
  - `Index.tsx` : interface principale de l’agent (navigation dossiers/documents).
  - `AdminDashboard.tsx` : tableau de bord et outils pour les administrateurs d’entreprise.
  - `SuperAdminDashboard.tsx` : gestion multi‑tenants pour le super admin.
  - `Profile.tsx` : gestion du profil utilisateur.
  - `NotFound.tsx` : page 404 pour les routes inconnues.

- `src/contexts/AuthContext.tsx`  
  Contexte d’authentification (utilisateur connecté, rôle, fonctions de login/logout, etc.).

- `src/components/ProtectedRoute.tsx`  
  Composant de garde de route qui vérifie que l’utilisateur est authentifié et possède l’un des rôles requis avant d’accéder à une page.

## 6. Installation et lancement en local

### 6.1. Prérequis

- Node.js + npm installés sur votre machine.

### 6.2. Installation

Dans un terminal, exécuter :

```sh
# Cloner le dépôt
git clone https://github.com/EternelCodeur/ArchiDrive.git

# Se placer dans le dossier du projet
cd multi-share-vault

# Installer les dépendances
npm install
```

### 6.3. Lancer l’application en développement

```sh
npm run dev
```

Ensuite, ouvrir l’URL indiquée par Vite (en général `http://localhost:5173`) dans votre navigateur.

### 6.4. Build pour la production

```sh
npm run build
```

Puis, pour prévisualiser le build :

```sh
npm run preview
```

## 7. Navigation et scénarios d’usage

1. **Connexion**  
   - Accéder à `/login` ou à la racine `/` (redirection vers `/login`).  
   - Saisir les identifiants.  
   - En fonction du rôle, l’utilisateur est redirigé vers l’espace adapté.

2. **Agent**  
   - Accès à `/agent`.  
   - Consultation de l’arborescence documentaire.  
   - Ouverture et téléchargement des documents selon les droits.

3. **Administrateur d’entreprise**  
   - Accès à `/admin`.  
   - Gestion des utilisateurs de l’entreprise.  
   - Organisation des dossiers et ajustement des droits.

4. **Super administrateur**  
   - Accès à `/super-admin`.  
   - Gestion des tenants (entreprises clientes).  
   - Supervision globale et configuration avancée.

5. **Profil utilisateur**  
   - Accès à `/profile`.  
   - Mise à jour des informations personnelles et des paramètres liés au compte.

## 8. Sécurité et gestion des accès

- Toutes les routes applicatives (hors `/login`) sont protégées par `ProtectedRoute`.
- Chaque route définit les **rôles autorisés** (ex. `allowedRoles={["agent"]}` pour `/agent`).
- L’`AuthProvider` fournit le contexte d’authentification à l’ensemble de l’application.

## 9. Évolutions possibles

- Intégration d’un backend réel (API REST/GraphQL) pour la gestion des documents et des utilisateurs.
- Ajout de logs d’audit détaillés (qui a accédé à quel document, quand, etc.).
- Gestion avancée des métadonnées de documents (tags, versions, historique).
- Intégration avec des systèmes de stockage externes (S3, Azure Blob Storage, etc.).

---

Cette documentation donne une vue d’ensemble de l’application Archi Drive, de son architecture et de son utilisation. Adaptez ou complétez‑la selon l’évolution fonctionnelle et technique du projet.
