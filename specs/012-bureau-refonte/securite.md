# Sécurité — Spec 012 (modèle de menaces)

Le dépôt est public : on part du principe qu'un attaquant connaît le code, les seuils, les routes et cette page. La sécurité ne repose donc sur aucun secret de conception (principe de Kerckhoffs). Elle repose sur les contrôles serveur, les limites de fréquence et la décision humaine.

## Acteurs hostiles

| Acteur | Ce qu'il veut |
|---|---|
| **Robot d'inscription** | créer des comptes en masse, inonder la file de modération, obtenir un badge sans visage réel |
| **Fraudeur** (arnaque sentimentale) | obtenir le badge « vérifié » avec un visage volé ou généré |
| **Membre malveillant** | lire ou modifier ce qui ne le concerne pas, gêner un autre membre (signalements abusifs) |
| **Site tiers** | faire exécuter un geste admin par le navigateur d'un modérateur connecté (CSRF) |
| **Session admin volée ou ancienne** | sanctionner en masse, supprimer des comptes, exfiltrer des données de membres |
| **Dépendance compromise** (npm, PR Dependabot) | exécuter du code en CI ou en production |

## Menaces et parades

### Vérification (US1, US2)

| # | Menace | Parade | Exigence |
|---|---|---|---|
| M1 | Selfie généré par IA avec le bon code | Validité de 30 min, comparaison humaine aux photos du profil, motif « image générée ». Le risque est réduit, pas annulé (documenté) | FR-001, FR-006, FR-007 |
| M2 | Rejeu d'un selfie déjà validé ailleurs ou d'un ancien code | Code révoqué au tirage suivant et consommé à l'envoi ; lié au membre | FR-001, FR-002 |
| M3 | Inondation de la file par des robots | Tirage réservé aux comptes à e-mail confirmé, une demande en file au plus par compte, limite de fréquence au tirage et à l'envoi par compte **et** par IP, attente de 24 h après 3 refus | FR-S01, FR-S02 |
| M4 | Fichier piégé (polyglotte, image géante, bombe de décompression) | Contrôle du type réel (déjà fait dans `r2.ts`), 5 Mo au plus, limite de pixels avant décodage, OCR sur une image réduite | FR-S03 |
| M5 | Fuite de position par les métadonnées du selfie | Métadonnées retirées avant stockage (déjà fait) ; l'indice « sans données d'appareil » se calcule **avant** le retrait et seul un booléen est gardé | FR-S04 |
| M6 | OCR comme oracle (tâtonner jusqu'à ce que la lecture passe) | La lecture ne décide jamais ; son résultat n'est jamais renvoyé au membre | FR-005, FR-S05 |
| M7 | Énumération des statuts d'autrui | Les routes membre ne lisent que la session, aucun identifiant en paramètre | FR-S06 |

### Hub et gestes (US3 à US6)

| # | Menace | Parade | Exigence |
|---|---|---|---|
| M8 | Accès d'un non-admin | `requireAdmin` (404) sur chaque route, rôle relu en base, **fermé si la base ne répond pas** sur les nouvelles routes | FR-S07 |
| M9 | CSRF sur `POST /api/admin/gestes` | Exiger `Content-Type: application/json` et un en-tête `Origin` égal à l'origine du site, et refuser sinon (y compris pour `sendBeacon`) | FR-S08 |
| M10 | Incohérence entre le cas et le membre (IDOR) | Le serveur relit le membre à partir du cas ; le `membreId` envoyé n'est qu'un contrôle de cohérence (refus si différent) | FR-S09 |
| M11 | Rejeu d'une clé avec un autre contenu | La clé est liée à l'empreinte du geste ; même clé avec un autre contenu → `echec`, rien n'est appliqué | FR-S10 |
| M12 | Sanctions en masse depuis une session volée | Supprimer un compte ne passe **jamais** par un lot (geste immédiat, confirmation, ressaisie du pseudo) ; au plus 10 bannissements par heure et par admin, au-delà refus et alerte au journal | FR-S11 |
| M13 | Fermeture d'onglet qui envoie un geste encore annulable | Les gestes dans leur délai d'annulation **ne partent pas** à la fermeture ; ils sont gardés et proposés à la réouverture (« 2 gestes non envoyés : envoyer ou abandonner ») | FR-S12 (remplace l'acceptation 4 d'US5) |
| M14 | Données de membres laissées sur un appareil partagé | Le stockage local ne garde que des identifiants et des codes de geste, sans pseudo ni texte ; vidé à la déconnexion | FR-S13 |
| M15 | Injection SQL par la recherche ou le curseur | SQL paramétré uniquement (`$queryRaw` à gabarit, jamais `Unsafe`), `%` et `_` échappés dans la recherche, curseur décodé et validé strictement (refus 400) | FR-S14 |
| M16 | XSS par un pseudo, une bio, un signalement ou un titre du journal | Rendu React échappé, **aucun** `dangerouslySetInnerHTML` ni info-bulle en HTML (le prototype en utilisait, pas le code) | FR-S15 |
| M17 | Signalements abusifs pour faire masquer quelqu'un | Aucune sanction automatique ; le repère rappelle de juger le contenu, pas le nombre ; relecture possible | FR-005, FR-034 |
| M18 | Relecture répétée pour encombrer la file | Une relecture par masquage, limite de fréquence | FR-S16 |

### Activité (US7)

| # | Menace | Parade | Exigence |
|---|---|---|---|
| M19 | Cache servi à un non-admin | La garde admin se fait **hors** de la fonction mise en cache ; la réponse porte `Cache-Control: private, no-store` ; la clé de cache ne dépend que de la période | FR-S17 |
| M20 | Ré-identification par un petit nombre dans une capture partagée | Interface admin seulement ; aucune liste nominative dans l'activité ; aucun export | FR-037 |

### Chaîne d'approvisionnement

| # | Menace | Parade | Exigence |
|---|---|---|---|
| M21 | Nouvelle dépendance compromise | **Aucune** dépendance ajoutée par la 012 (graphiques à la main, OCR déjà présent) ; toute exception exige une justification dans la PR | FR-S18 |

## Hors périmètre, constats à traiter à part

- **C1** : `verifyAdmin` (`src/lib/admin.ts`) se replie sur le rôle du jeton quand la base est injoignable. C'est ouvert en cas d'échec, contraire au principe III. La 012 n'en dépend pas (FR-S07), mais les routes existantes oui.
- **C2** : la CI exécute `npm ci` (scripts d'installation compris) avec `DATABASE_URL` en variable, et ce secret existe aussi côté Dependabot. Une mise à jour de dépendance piégée pourrait lire la chaîne de connexion de la base Neon de développement.
