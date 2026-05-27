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
- **Chat E2E** — Messages chiffrés de bout en bout, le serveur ne lit jamais vos messages
- **Badge vérifié** — Selfie vérifié par la communauté
- **Modération communautaire** — Signalement, blocage, auto-unmatch
- **Mode invisible** — Voyez les croisements sans apparaître dans les leurs
- **PWA** — Installable sur mobile, pas besoin de store

## Stack technique

- **Frontend** : Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend** : Next.js API Routes (monolithe)
- **Base de données** : PostgreSQL + PostGIS
- **Temps réel** : Pusher
- **Stockage** : Cloudflare R2
- **Chiffrement** : ECDH (P-256) + AES-256-CBC
- **Tests** : Vitest + Testing Library + Playwright
- **CI** : GitHub Actions

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