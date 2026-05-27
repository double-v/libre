# Libre

> *Notre but, c'est que vous quittiez l'appli.*

Application de rencontre gratuite, open source, sans abonnement ni revente de données. Financée uniquement par dons pour l'hébergement.

## Philosophie

- **Gratuit. Pour toujours.** Pas d'abonnement, pas de fonctionnalités payantes, pas de pubs.
- **Vos données sont à vous.** Messages chiffrés de bout en bout (E2E). Position géolocalisée floutée. Suppression de compte = purge totale.
- **Notre but, c'est que vous quittiez l'appli.** Le chat sert à faire le pont vers la vraie vie. Une fois le contact établi, on sort de l'app.

## Fonctionnalités

- **Croisements** — Découvrez les célibataires que vous croisez IRL
- **À proximité** — Voyez qui est proche de vous en temps réel
- **Match mutuel** — Likez, si c'est réciproque le chat s'ouvre
- **Chat E2E** — Messages chiffrés de bout en bout (ECDH P-256 + AES-256-GCM), le serveur ne lit jamais vos messages
- **Profil riche** — Bio, centres d'intérêt (5 catégories), pratiques & préférences (optionnel), orientation, liens sociaux
- **Identité de genre inclusive** — Femme, Homme, Non-binaire, Genderfluid, Agender, Bigender, Pangenre, Queer, En questionnement, Autre, ou pas de précision
- **Badge vérifié** — Selfie vérifié par la communauté
- **Modération communautaire** — Signalement, blocage, auto-unmatch
- **Mode invisible** — Voyez les croisements sans apparaître dans les leurs
- **Pédagogie vie privée** — Conseils intégrés dans l'UX : pseudo encouragé, explications sur le chiffrement, rappels de prudence
- **PWA** — Installable sur mobile, pas besoin de store

## Sécurité

- Chiffrement E2E : ECDH (P-256) + AES-256-GCM (authentifié)
- GPS flouté côté client avant envoi (`crypto.getRandomValues`)
- Distances arrondies (buckets anti-trilatération)
- Headers de sécurité : CSP, HSTS preload, X-Frame-Options DENY, Permissions-Policy
- Rate limiting par endpoint (auth, messages, géoloc, likes, signalements)
- Validation des clés publiques ECDH côté serveur
- Whitelist des champs modifiables (pas de mass assignment)
- OAuth conditionnel (boutons affichés uniquement si configurés)

## Stack technique

- **Frontend** : Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend** : Next.js API Routes (monolithe)
- **Base de données** : PostgreSQL + PostGIS sur Neon (driver adapter Prisma 7)
- **Auth** : NextAuth.js (JWT strategy, custom Prisma adapter)
- **Temps réel** : Pusher (canaux privés authentifiés)
- **Stockage** : Cloudflare R2
- **Chiffrement** : ECDH (P-256) + AES-256-GCM
- **Tests** : Vitest + Testing Library + Playwright
- **CI** : GitHub Actions
- **Déploiement** : Vercel + Neon

## Développement local

```bash
# Cloner le repo
git clone https://github.com/VOTRE_USER/libre.git
cd libre

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Remplir les variables dans .env

# Base de données
npx prisma generate
npx prisma migrate dev

# Lancer l'app
npm run dev
```

## Tests

```bash
# Tests unitaires + intégration
npx vitest run

# Tests E2E
npx playwright test
```

## Licence

PolyForm Noncommercial 1.5.0 — Utilisation libre pour tout usage non commercial. Voir [LICENSE](./LICENSE).

---

*Rencontre libre. Gratuit. Sans revente de données.*