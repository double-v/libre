# Libre — Design Spec : Backoffice, Placeholders & Chat Anonyme

Date : 2026-05-28
Statut : Approuvé par l'utilisateur

## Priorisation

1. **Backoffice admin** (haute priorité)
2. **Placeholders état vide** (moyenne priorité)
3. **Chat anonyme "La Place"** (moyenne priorité)
4. **Vue atome/réseau** (ultra basse — pas planifiée pour l'instant)

---

## 1. Backoffice Admin

### Architecture

- **Route** : `/admin` dans le route group `(main)`, layout séparé sans bottom nav dating
- **Protection** : middleware Next.js vérifie `session.user.role === "ADMIN"`. Toute requête vers `/admin/*` renvoie **404** (pas 403 — on cache l'existence du backoffice)
- **Double-check** : chaque API route admin vérifie aussi le rôle côté handler

### Sections

| Section | Fonctionnalité |
|---------|---------------|
| **Dashboard** | Nb utilisateurs, signalements en attente, vérifications en attente |
| **Utilisateurs** | Liste paginée, recherche par nom/email, profil détaillé, bannir/débannir, supprimer |
| **Signalements** | Liste des reports avec statut, traiter (avertir/bannir/ignorer), voir le contexte |
| **Vérifications** | Demandes de vérification selfie, approuver/refuser avec raison |
| **Logs** | Journal des actions de modération (adminId, action, targetUserId, reason, createdAt) |

### Modèle de données

Ajout au schema Prisma :

```prisma
model ModerationLog {
  id           String   @id @default(uuid())
  adminId      String
  admin        User     @relation("ModerationActions", fields: [adminId], references: [id])
  targetUserId String
  targetUser   User     @relation("ModerationTargets", fields: [targetUserId], references: [id])
  action       String   // BAN, UNBAN, WARNING, DELETE_REPORT, APPROVE_VERIFICATION, REJECT_VERIFICATION
  reason       String?
  createdAt    DateTime @default(now())
}
```

Le champ `role` existe déjà sur `users` (valeurs : `USER`, `ADMIN`). Extensible pour ajouter `MODERATOR` plus tard.

### Sécurité

- Middleware check sur **toutes** les routes `/admin/*` (pages + API)
- API routes : vérification de rôle côté handler (double-check)
- Pas de lien vers `/admin` dans l'UI publique — accès par URL directe uniquement
- Actions sensibles (ban, suppression) nécessitent confirmation côté client
- Rate limiting sur les API admin
- Les mots de passe admin ne sont jamais exposés dans l'interface

### UI

- Design sobre et fonctionnel, réutilise les couleurs existantes (thème coral)
- Tableaux pour les listes, modales pour les actions
- Pas de composant library externe — style maison cohérent avec l'app
- Priorité desktop, responsive secondaire

---

## 2. Placeholders (État Vide)

### Concept

Cartes placeholder stylisées quand il n'y a pas d'utilisateurs à proximité ou dans le fil Découvrir. Encourage l'invitation et donne vie à la page.

### Composition

- **3-4 cartes vides** stylisées :
  - Avatar gris/coral pâle avec icône silhouette
  - Nom fictif attractif (ex: "Quelqu'un de sympa ?")
  - Bio placeholder (ex: "En attente de quelqu'un comme toi…")
  - Pas de like, pas de swipe — statiques
- **1 carte CTA** parmi les placeholders :
  - Design distinct (bordure coral, icône de partage)
  - Texte : "Invite quelqu'un sur Libre"
  - Bouton copiant un lien de partage dans le presse-papier
  - Toast de confirmation "Lien copié !"

### Où ça apparaît

- Page Découvrir : quand le fil est vide ou plus de résultats
- Page À proximité : quand personne dans le rayon
- Composant réutilisable `EmptyStateCards` s'adaptant au contexte

### Comportement

- Lien de partage avec paramètre `ref` pour tracking basique
- Animation subtile d'entrée (fade-in)
- Les placeholders ne sont pas interactifs (pas de like/pass)

---

## 3. Chat Anonyme — "La Place"

### Concept

Une place publique anonyme avec un thème du jour qui change les règles. Ludique, vivant, les contraintes trollesques créent du lien social sans effort de modération.

### Route et navigation

- **Route** : `/square`
- **Icône** dans la bottom bar (distincte du chat privé)
- **Accès** : authentifié uniquement (profil complet pas requis)

### Thème du jour

Le thème est déterminé côté serveur (hash du jour, pas de config complexe).

| Jour | Thème | Règle |
|------|-------|-------|
| Lundi | Pseudonyme classique | Vieux prénoms français aléatoires (Archibald, Gertrude, Gédéon…) |
| Mardi | Emojis only | Seulement des émojis, pas de texte |
| Mercredi | Formules de politesse | Choix limité de phrases pré-faites |
| Jeudi | GIF only | Uniquement des GIFs (sélection curatée ou Giphy) |
| Vendredi | Pseudonyme + texte libre | Pseudos aléatoires, écriture normale |
| Samedi | Charade | Uniquement devinettes et réponses |
| Dimanche | Silence doré | Seulement des réactions (❤️, 😊, 🔥, 👋), pas de texte |

Les thèmes sont ajustables. Le principe : le thème change chaque jour, est affiché en haut du chat, et modifie le comportement de l'input.

### Transport temps réel

- **SSE (Server-Sent Events)** pour recevoir les messages — pas de coût fixe, compatible Vercel Fluid Compute
- **POST** pour envoyer un message
- Pas de Pusher (coût), pas de WebSocket persistant

### Modération

- **Pas de modération proactive** — les contraintes du thème sont des garde-fous naturels
- Bouton **signaler** sur chaque message (système de reports existant)
- Les thèmes restrictifs (emojis, formules, réactions) empêchent la plupart des abus
- Admin peut intervenir via le backoffice (supprimer un message, bannir du square)

### Stockage

- **Fenêtre glissante** : 50 derniers messages en mémoire côté serveur
- À la reconnexion, le client récupère les 50 derniers via SSE
- Pas de table Prisma pour les messages du square
- Les messages disparaissent au redéploiement — c'est voulu, c'est éphémère

### Modèle de données

- Ajout d'un champ `squareBannedUntil DateTime?` sur `users` (optionnel)
- Le thème du jour est calculé côté serveur, pas stocké
- Les messages sont en mémoire uniquement

---

## 4. Vue Atome/Réseau (Ultra Basse Priorité — Pas Planifiée)

Visualisation anonymisée des interactions entre membres sous forme d'atomes et de liaisons. Code couleur par type d'interaction. Plus une oeuvre d'art qu'une feature. À revisiter quand l'app aura une base d'utilisateurs.

---

## Approche d'implémentation

**Progressive** : chaque feature est indépendante, construite et déployée séquentiellement.

1. Backoffice admin (pose les fondations : rôle admin, middleware, moderation_log)
2. Placeholders (composant UI simple)
3. Chat anonyme / La Place (feature complète)