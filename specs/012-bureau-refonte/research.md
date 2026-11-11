# Recherche — Spec 012, bureau de modération

Chaque décision part de l'existant du dépôt au 2026-11-11 (`libre/main`, 9f652d7).

## R1 — Tirage du code de vérification

- **Décision** : une table `verification_codes` à une ligne par membre (clé = `userId`), écrasée à chaque tirage : code, tiré le, expire le. Le selfie est accepté seulement si le code envoyé est celui de la ligne et qu'il n'a pas expiré. La ligne est effacée à la mise en file.
- **Pourquoi** : FR-001 exige qu'un nouveau tirage invalide le précédent. Le jeton signé sans état de #436 (`jeton-geste.ts`) ne peut pas révoquer un jeton plus ancien.
- **Écarté** : garder le jeton `jose` avec un compteur de version sur `User` (un champ de plus sur une table centrale, pour rien) ; Redis/Upstash (déjà utilisé pour le rate limit, mais une donnée de vérification n'a pas à y vivre).
- **Alphabet** : chiffres 2 à 9, quatre positions (4 096 codes). Tirage par `crypto.randomInt`.

## R2 — Limite de nouvel essai (FR-012)

- **Décision** : dérivée, jamais stockée. Le serveur lit les trois dernières demandes du membre : si les trois sont refusées et qu'aucune validation ne les suit, le tirage est refusé jusqu'à `resolvedAt` du troisième refus + 24 h.
- **Pourquoi** : `verification_requests` garde déjà statut et date de décision ; un compteur stocké pourrait diverger.

## R3 — Lecture automatique du code (FR-004, FR-005)

- **Décision** : réutiliser `src/lib/fraude/lecture-photo.ts` (tesseract.js embarqué, spec 006) avec une liste blanche de caractères `23456789` et une normalisation qui extrait la première suite de quatre chiffres. Lancée dans `after()` à la réception du selfie ; résultat écrit dans `verification_requests.code_lu` (`null` = en cours, `''` = lecture impossible).
- **Pourquoi** : aucun coût ni réseau, le paquet est déjà dans `serverExternalPackages` et le traçage de sortie. L'écriture manuscrite lit mal : c'est un indice, jamais une décision (FR-005).
- **Écarté** : un service OCR externe (coût, et une photo de membre sortirait chez un tiers).

## R4 — Gestes par lots et idempotence (FR-026 à FR-028)

- **Décision** : une route `POST /api/admin/gestes` qui reçoit 1 à 20 gestes. Chaque geste porte une `cle` (UUID tirée par le client). `moderation_logs` gagne une colonne `cle` unique et nullable : un geste dont la clé existe déjà rend l'issue enregistrée sans rien refaire. Chaque geste est appliqué par une écriture conditionnelle (`updateMany … where status = 'pending'`). Zéro ligne touchée signifie « déjà traité », et l'auteur se relit alors sur le cas.
- **Pourquoi** : une invocation pour N gestes sur l'offre Hobby ; l'unicité en base tient même si le client renvoie le lot après une coupure.
- **Gestes** : ils délèguent aux fonctions existantes (`src/lib/moderation/gestes.ts`, routes `reports/[id]`, `verifications/[id]`, `answers/[id]`, `users/[id]/photos`, `indices/*`). On en extrait la logique dans des fonctions pures du point de vue HTTP pour que l'unitaire et le lot produisent le même effet et la même ligne de journal (FR-023).
- **Envoi côté client** : file en mémoire, délai d'annulation 5 s, envoi groupé ; `navigator.sendBeacon` sur `pagehide` ; les gestes non partis sont gardés en `localStorage` (commodité par appareil) et proposés à la réouverture.

## R5 — « Ouvert par » (FR-030)

- **Décision** : table `admin_cas_ouverts` (clé du cas, `adminId`, `ouvertAt`), écrite à l'ouverture d'une fiche qui a des cas, lue avec une fenêtre de 10 minutes. Pas de temps réel : l'information se rafraîchit au rechargement de la fiche.
- **Écarté** : Pusher presence (un canal de plus pour un besoin rare, à un seul modérateur aujourd'hui).

## R6 — Liste du hub (FR-013 à FR-017)

- **Décision** : `GET /api/admin/membres` en SQL brut. On calcule les cas en attente par membre à partir des tables existantes (signalements `pending`, vérifications `pending`, réponses à revoir, photos signalées, signaux non tranchés, relectures), on trie par (gravité, ancienneté, id) et on pagine par curseur de 20 lignes. Les compteurs des filtres de travail viennent d'une seule requête `UNION ALL` de `COUNT`, qui remplace `countAdminQueues` dans le layout et `/api/admin/queues`.
- **Pourquoi** : le cas est une vue dérivée (Key Entities) ; aucune table « cas » à tenir à jour.
- **État dans l'adresse** : `?filtre=&tri=&q=&membre=` lus par `useSearchParams` ; l'ouverture d'une fiche remplace l'entrée d'historique (`router.replace`), le retour la retire.

## R7 — Activité (FR-035 à FR-041)

- **Décision** : `GET /api/admin/activite?periode=7|30|90` renvoie toutes les séries d'un chapitre à la fois, calculées en SQL (`GROUP BY` jour, semaine, jour × heure), et mises en cache 10 minutes par période. Le cache suit les règles de Next 16 dans `AGENTS.md`, à vérifier avant le code.
- **Sources** : arrivées (`users.createdAt`) ; avancée (e-mail vérifié, profil rempli, photo, premier like envoyé, premier match, premier message dans une conversation) ; présence (`users.last_seen_at`, spec 011) ; « qui reste » (part des arrivées de chaque semaine vues dans les 14 derniers jours, FR-039) ; moments (`messages.createdAt`, fuseau Europe/Paris, FR-038) ; réponse (conversations où le destinataire du premier message a écrit à son tour) ; démographie (requêtes déjà présentes dans `stats/route.ts`) ; modération (`moderation_logs`, `verification_requests`) ; repères (`journal_posts.publieeAt`, statut `publiee`).
- **Aucune nouvelle collecte** (FR-037) : tout existe déjà.
- **Phrases** : module pur `src/lib/activite/recit.ts`. Tournures fixes (hausse, baisse, stable sous 3 %), accords au singulier, au pluriel et à zéro. Testé sur une table de cas.
- **Graphiques** : composants SVG écrits à la main (courbe adoucie, barres, points-personnes, bulles, dizaines). Pas de bibliothèque : le bundle reste léger et les tokens s'appliquent directement.

## R8 — Avertir et masquer (FR-032 à FR-034)

- **Avertir** : table `avertissements` (membre, code du message, auteur, date, `luAt`). Messages en liste fermée dans `src/lib/moderation/avertissements.ts`. Le membre les lit par `GET /api/moderation/avertissement` au montage du shell connecté, puis les acquitte par `POST`.
- **Masquer** : champs `User.masqueJusqua` et `User.masqueMotif`, et `User.relectureDemandeeAt`. Découvrir exclut `masqueJusqua > now()` (à côté de `retraitAt`) ; l'échéance se lève d'elle-même par la comparaison de dates, sans tâche planifiée (les crons sont morts sur Hobby). La relecture crée un cas dérivé tant que `relectureDemandeeAt` est postérieure au masquage.
- **Garde de non-fuite** : `masqueJusqua`, `masqueMotif`, `relectureDemandeeAt` et les avertissements sont privés et s'ajoutent à `city-label-never-leaks.test.ts`.

## R9 — Notification de refus (FR-010)

- **Décision** : nouveau `PushKind` `verification`, titre « Ta vérification a une réponse », sans motif, vers `/verify`. Le repère de présence dans Paramètres est dérivé du dernier statut (`refusee` et non vue).

## R10 — Navigation et redirections (FR-042, FR-043)

| Ancienne adresse | Nouvelle |
|---|---|
| `/admin` | `/admin` (Activité) |
| `/admin/users`, `/admin/users/[id]` | `/admin/membres`, `/admin/membres?membre=[id]` |
| `/admin/reports` | `/admin/membres?filtre=report` |
| `/admin/verifications` | `/admin/membres?filtre=verif` |
| `/admin/indices`, `/admin/profils` | `/admin/membres?filtre=indice` |
| `/admin/feedback` | `/admin/retours` |
| `/admin/logs` | `/admin/outils/historique` |
| `/admin/journal`, `/admin/square`, `/admin/circle/alerts`, `/admin/features`, `/admin/appearance`, `/admin/rate-limits`, `/admin/retention` | `/admin/outils/<même nom>` |

Les redirections passent par `redirects()` de `next.config` (308). Les URL des pushs admin (`/admin/reports`, `/admin/feedback`) sont mises à jour dans `buildPayload`.

## R11 — Second modérateur

Seul le rôle `ADMIN` existe (`proxy.ts`, layout admin). Un second modérateur est un second compte `ADMIN`. Aucun rôle n'est ajouté (hors périmètre).

## R12 — Charte et composants

Composants à proposer dans `DESIGN.md` avant le code (principe IV) : `SeverityStripe`, `CaseTag`, `BottomSheet` (confirmation), `SyncIndicator`, `UndoToast` (à rapprocher du toast existant), `PeopleDots`, `SoftLine`, `SoftBars`, `TimeBubbles`, `TenPeople`, `StoryLede`. Ils se rangent dans `src/components/ui/` (génériques) ou `src/components/admin/` (propres à l'admin). Les couleurs viennent des tokens (`--coral`, `--blush`, `--gold`/miel, abricot à ajouter s'il manque) dans les deux modes et tous les thèmes.
