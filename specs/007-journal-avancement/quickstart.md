# Quickstart — valider la spec 007 de bout en bout

Recette locale, **jamais sur Neon** (cf. mémoire « Tester la livraison en local ») :
PostgreSQL local `libre_local_007`, `prisma migrate deploy` dessus, un admin et
un membre insérés, `next dev -p 3100` avec `DATABASE_URL` en variable
d'environnement (le `.env` reste intact), Chromium en cache pour Playwright.

## 1. Garde-fous (US3, SC-003/SC-004)

1. Admin › Journal › Nouvelle publication. Corps : « Écris-nous à contact@exemple.fr ».
   → Publier refusé, alerte **bloquante** r5 ; aucune case ne la lève.
2. Corps : « Voir /api/admin/journal et @lola_privee ». → deux alertes levables (r3, r5) ;
   Publier inactif tant que les deux ne sont pas levées **et** la case des règles cochée.
3. Lever, cocher, publier → 200. Modifier l'extrait `/api/admin/journal` → l'alerte revient.
4. Rejouer l'étape 2 **à la main** contre `POST /api/admin/journal/<id>/publier` sans `levees` → 422, rien d'écrit.

## 2. Lecture publique (US1, SC-001/SC-002)

1. Publier une nouvelle propre. Ouvrir `/journal` en navigation privée, JavaScript désactivé :
   liste puis publication lisibles en entier.
2. `curl -s /journal/<slug>` anonyme **et** avec le cookie de session du membre :
   `diff` des deux corps HTML → vide.
3. Corps contenant `<script>alert(1)</script>` → affiché en texte.
4. Dépublier → `/journal/<slug>` répond « introuvable », la liste ne la montre plus.

## 3. Journal de modération (SC-006)

`/admin/logs` montre `PUBLISH_POST`, `UPDATE_POST`, `UNPUBLISH_POST` avec `post:<id>` et les règles levées, jamais d'extrait.

## 4. Interrupteur des commentaires (FR-023)

Base neuve : `/admin/features` montre « Commentaires du journal » **coupé**. L'activer, recharger :
activé ; `GET /api/features` → `journal_comments: true`. Le couper : `false`. Les trois interrupteurs
existants gardent leur état.

## 5. Pixels (principe V)

Captures clair/sombre, 390 px et 1280 px : liste, publication, état vide, écran de rédaction avec
alertes. Aucun défilement horizontal (titre long, mot sans espace). Échantillonner plusieurs points
du bloc d'alertes et du bouton Publier.

## Gates

`npx vitest run` · `npx tsc --noEmit` · `npx eslint` sur les fichiers touchés.
