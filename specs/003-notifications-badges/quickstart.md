# Quickstart — valider Notifications et badges de bout en bout

Prérequis : PostgreSQL local + seed + dev server (mémoire `getlibre-test-livraison-local`), deux comptes membres (A, B) et un compte admin. Chromium en cache pour Playwright (mémoire `getlibre-playwright-ubuntu26-workaround`). Pour le lot 2 : `VAPID_*` dans `.env` (`npx web-push generate-vapid-keys`), un Android (Chrome) et un iPhone (16.4+) sur le LAN.

Gates locaux avant chaque PR : `npx vitest run`, `npx tsc --noEmit`, `npx eslint .`, puis le gate visuel.

---

## Lot 1

### US1 — pastille de messages non lus

1. Deux navigateurs : A sur `/discover`, B ouvre la conversation avec A et envoie un message.
2. **Attendu** : sur A, dans les 5 s et sans rechargement, une pastille apparaît sur l'onglet Messages (`aria-label="Nouveaux messages"`). Aucun chiffre nulle part.
3. A ouvre `/messages` : la conversation avec B porte la pastille, les autres non.
4. A ouvre la conversation : la pastille de la conversation et celle de l'onglet disparaissent sans rechargement.
5. Recharger A : état identique (resync base). Mettre l'onglet A en arrière-plan, envoyer depuis B, revenir : pastille présente (resync `visibilitychange`).
6. Cas négatifs : A bloque B, B envoie → pas de pastille ; B supprime son message avant lecture → pastille disparaît au prochain refetch.
7. Contrat : `curl -b <cookie A> /api/chat/unread` → `{ "conversationIds": [...] }` sans `count`.
8. Gate visuel : capture Playwright de la tab bar et de la liste avec/sans pastille, en clair et sombre, thème `libre` et `retro` ; échantillonner plusieurs points de la pastille (pas seulement son centre).

### US2 — badge d'icône

1. Installer la PWA (Android : « Installer l'application » ; iOS : Partager → Sur l'écran d'accueil).
2. Recevoir un message, revenir à l'écran d'accueil : **badge sans nombre** sur l'icône.
3. Lire le message : le badge disparaît (sans fermer l'app).
4. Se déconnecter : badge retiré.
5. Dans un onglet de navigateur classique : aucune erreur console (`setAppBadge` feature-detecté).

### US3 — files admin

1. Compte admin sur `/discover` : pas de pastille sur l'icône admin si les files sont vides.
2. Compte B signale un profil.
3. Admin change de page (ou revient au premier plan) : pastille sur l'icône admin de la barre.
4. `/admin` : `CountChip` « 1 » à côté de Signalements, rien à côté des files vides.
5. Traiter le signalement ; naviguer : chip disparue, pastille disparue.
6. Compte membre : `curl /api/admin/queues` → `404` ; aucune requête réseau vers cette route dans l'onglet réseau.
7. Gate visuel : `SiteNav` avec pastille (mobile 400 px et desktop), sidebar admin avec chips.

---

## Lot 2

### US4 — Web Push opt-in

1. Compte neuf, `/settings` : section « Me prévenir hors de l'app » **désactivée** ; aucune demande d'autorisation n'a été faite (`Notification.permission === 'default'`).
2. Activer sur Android : demande d'autorisation → accepter → `POST /api/push/subscriptions` `201` ; une ligne dans `push_subscriptions`.
3. Fermer Libre. B envoie un message : notification « Nouveau message » dans la minute, sans contenu ni nom. La toucher : Libre s'ouvre sur `/chat/<conv>`.
4. Rafale : B envoie 5 messages sans que A lise → **une seule** notification. A lit, B renvoie → nouvelle notification.
5. Libre au premier plan sur `/discover` : B envoie → **aucune** notification système, pastille seulement.
6. Match : A et B se likent, A hors de l'app → « Nouveau match » → `/messages`.
7. Désactiver le réglage : `DELETE` `204`, ligne supprimée, plus de notification.
8. iOS Safari non installée : la section affiche l'astuce écran d'accueil, pas de switch actif. Installer, rouvrir : switch disponible ; refaire 2–3.
9. Refus : refuser l'autorisation → texte « bloquées dans les réglages », pas de nouvelle demande au rechargement.
10. Déconnexion depuis Paramètres et depuis Profil : abonnement supprimé côté serveur.
11. Abonnement mort : modifier `endpoint` en base vers une URL renvoyant 410 (ou désinstaller la PWA) → envoi suivant : ligne supprimée, message envoyé quand même (`201`).
12. Panne : `VAPID_PRIVATE_KEY` vide → envoi de message `201`, log `push.send.skipped`.
13. Confidentialité : le paragraphe notifications décrit adresse d'appareil conservée, contenu absent, suppression au désabonnement/compte.
14. Gate visuel : section Paramètres dans ses quatre états (désactivé, actif, iOS non installée, refusé).

### US5 — push admin

1. Admin abonné, app fermée. B signale un profil → « Nouveau signalement » → `/admin/reports`.
2. B envoie un retour → « Nouveau retour » → `/admin/feedback`.
3. Membre abonné (A) : rien reçu.
4. Texte : ni nom, ni motif (vérifier la charge utile côté test unitaire de `push/server.ts`).
