# Chantier 01 — Sécurité : Vérif + Cercle de Confiance

> **Pourquoi c'est fondateur** : sans vérif d'identité et sans
> mécanisme de sécurité actif, toutes les valeurs (« safe pour
> les femmes », « anti-catfish », « modéré humainement ») sont
> du marketing. Ce chantier rend les valeurs **opérationnelles**.

## Problème utilisateur

Une femme (ou un utilisateur vulnérable) ouvre Libre. Elle voit :
- 12 profils. 3 ont l'air faux. 2 ont une photo volée. 7 sont OK
  mais elle ne sait pas.
- Elle like un profil. Le mec lui écrit. Premier message : « t'es
  chaude, on se voit ? ». Elle a pas de bouton « je suis pas sûre
  de moi pour ce RDV ».

**Aujourd'hui** : elle switche vers Bumble, où au moins elle a
l'illusion du contrôle.

**Avec ce chantier** : elle a 1) un signal de confiance cumulé
(badge vérifié + ancienneté), 2) un réseau de confiance
(3-5 personnes qu'elle a désignées) qui peuvent être prévenues
si elle ne valide pas un check-in de sécurité.

## Bénéfices (par pilier)

- **Lenteur-comme-luxe** : la confiance se construit **dans le
  temps**, ce qui favorise les users de long terme et défavorise
  les comportements opportunistes.
- **Honnêteté-par-défaut** : on ne prétend pas modérer
  algorithmiquement, on **donne à l'utilisatrice les outils** pour
  se protéger.
- **Gratuit-acte-politique** : c'est gratuit, contrairement à
  Noonlight (racheté par Tinder et devenu payant).

## Périmètre

### ✅ Inclus

1. **Vérification d'identité par selfie** (déjà conçue dans
   l'admin, voir issue #... et `/api/admin/verifications`)
   → **À durcir** : scoring progressif, pas binaire
2. **Niveau de confiance progressif** : pas juste « vérifié ou non »,
   mais une jauge qui monte avec : vérif + ancienneté + signalements
   reçus (négatif) + participation La Place + cercle déclaré
3. **Cercle de Confiance** : 3-5 personnes désignées par
   l'utilisateur. **V1 = Libre-only** (cf. décision #43) : les
   contacts doivent être des users Libre. V2 ajoutera le flow
   d'invitation hors-app. Si un check-in de sécurité expire, ils
   sont prévenus.
4. **Check-in de sécurité** : bouton « je suis safe » avec timer.
   À activer **avant ou pendant** un RDV. Si timer expire sans
   validation, le cercle est alerté avec la dernière position
   connue.
5. **Page "Mon niveau de confiance"** dans le profil : rend
   visible la progression, motive l'utilisateur à monter
   (sans punir ceux qui ne montent pas).

### ❌ Exclus (YAGNI)

- Partage de position **en continu** (trop intrusif, casse le
  pilier lenteur)
- Vérification par **pièce d'identité** (trop lourd, trop
  de data, RGPD-cost)
- **Chiffrement bout-en-bout** des messages de check-in (overkill
  pour des messages qui sont par nature alertés à un tiers)
- Intégration **Noonlight** ou autre service tiers (on perd le
  contrôle, on paye un SaaS, ça contredit la vertical)
- Partage avec les **autorités** automatique (responsabilité
  juridique, à externaliser : juste notifier le cercle, c'est
  eux qui décident)

## Architecture cible

### Schéma Prisma (delta)

```prisma
model TrustLevel {
  userId        String   @id
  user          User     @relation(fields: [userId], references: [id])
  score         Int      @default(0)  // 0-100, jamais affiché brut
  band          String   @default("newcomer")  // newcomer, member, trusted, anchor
  lastComputedAt DateTime @default(now())
  factors       Json     // détail du calcul, pour transparence
}

model TrustContact {
  id           String   @id @default(uuid())
  ownerId      String   // user qui désigne le contact
  owner        User     @relation("TrustContactOwner", fields: [ownerId], references: [id])
  contactId    String   // user qui est désigné comme contact (peut être hors-app si email/tel)
  contact      User?    @relation("TrustContactTarget", fields: [contactId], references: [id])
  contactEmail String?  // si le contact n'est pas sur Libre
  contactPhone String?  // si le contact n'est pas sur Libre
  channel      String   // "app" | "email" | "sms"
  createdAt    DateTime @default(now())

  @@unique([ownerId, contactId])
  @@index([ownerId])
}

model SafetyCheckin {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  status        String   // "active" | "validated" | "expired" | "cancelled"
  triggeredAt   DateTime @default(now())
  expiresAt     DateTime
  resolvedAt    DateTime?
  lastLat       Float?
  lastLng       Float?
  // Notes privées (jamais partagées au cercle)
  notes         String?

  @@index([userId, status])
  @@index([expiresAt, status])
}

model CheckinAlert {
  id            String   @id @default(uuid())
  checkinId     String
  checkin       SafetyCheckin @relation(fields: [checkinId], references: [id])
  contactId     String   // TrustContact.id
  sentAt        DateTime @default(now())
  deliveryStatus String  // "queued" | "sent" | "failed"

  @@index([checkinId])
}
```

### API

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/circle/contacts` | GET/POST/DELETE | Gérer mes contacts de confiance |
| `/api/circle/check-in` | POST | Démarrer un check-in (durée customizable, 30 min → 8h) |
| `/api/circle/check-in/:id/validate` | POST | Valider que je suis safe |
| `/api/circle/check-in/:id/cancel` | POST | Annuler un check-in |
| `/api/trust/level` | GET | Mon niveau de confiance (jamais celui des autres) |
| `/api/admin/circle/alert/:id` | GET | Page admin pour voir l'alerte et agir |

### Cron Vercel

- **Toutes les 5 min** : `scanExpiredCheckins` → créer des
  `CheckinAlert` pour chaque check-in expiré non-validé →
  dispatcher via le canal configuré (email via Resend,
  SMS via Twilio si activé).

## UX cible

### Page "Mon Cercle de Confiance" (settings/trust)

- **Header** : « Ton Cercle de Confiance » + explication en 2 lignes
- **Liste** : 3-5 contacts max. Chaque ligne = avatar + nom + canal
  + menu ⋮ pour éditer/supprimer
- **Bouton + Ajouter un contact** : bottom-sheet avec 2 onglets
  (Utilisateur Libre / Hors-app via email ou tel)
- **Empty state** : « Tu n'as pas encore de Cercle. C'est ton
  filet de sécurité pour tes futures rencontres. »

### Composant Check-inButton (à intégrer dans le chat 1:1)

- Apparaît après le 1er message échangé, en bas de la conversation
- Tooltip discret : « Tu as un RDV ? Active un check-in de
  sécurité avant. Si tu ne reviens pas, ton Cercle est alerté. »
- 2 états :
  - **Inactif** : « Activer un check-in de sécurité »
  - **Actif** : compte à rebours + bouton « Je suis safe » vert
    prominent

### Page "Mon niveau de confiance" (profile/trust)

- Bandeau avec 4 étapes : Nouveau·elle · Membre · Confiance · Ancrage
- Indicateur de progression discret (cf. `DESIGN.md` : pas de
  badge agressif, un halo coral qui s'épaissit)
- Détail au clic : « Pour passer à Confiance : complète ta
  vérif + 1 mois d'ancienneté + 0 signalement. »

## Garde-fous (anti-dérive)

- **Pas de** : partage de position continue
- **Pas de** : check-in obligatoire (toujours opt-in)
- **Pas de** :洩露 d'info du cercle à l'extérieur (le cercle
  est privé, seul l'utilisateur·rice le voit)
- **Pas de** : escalade automatique vers les autorités (le
  cercle décide s'il appelle les flics ou pas)
- **Oui** : possibilité de **désigner hors-app** (email/tel)
  pour les gens qui n'ont pas leur entourage sur Libre
- **Oui** : logs d'audit de toute action admin sur les alertes

## Métriques de succès

- **Adoption** : % d'utilisateurs actifs qui ont déclaré un
  cercle (objectif : 25% à M+3, 50% à M+6)
- **Utilisation** : % de check-ins lancés qui sont **validés**
  à temps (objectif : > 80%)
- **Sécurité** : nombre d'alertes émises / nb d'utilisateurs
  (signal faible au début, à corréler avec modération manuelle)
- **Confiance déclarée** : NPS segmenté « users avec cercle »
  vs « users sans cercle »

## Liens avec les autres chantiers

- **Chantier 04 Onboarding pacte** : on présente le Cercle
  **avant** le 1er match, pas après. Sinon trop tard, l'utilisateur
  ne l'installera pas.
- **Chantier 03 Prompts** : 1 prompt pourrait être « Quelle est
  la chose qui te ferait te sentir safe lors d'un 1er RDV ? » → ouvre
  la conversation sur la sécurité, légitime le cercle.
- **Chantier 06 UGC** : les users pourraient proposer des
  « scenarios de check-in » (ex : check-in de 4h, check-in avec
  position partagée, etc.).

## Phasage (détaillé dans `plan.md`)

- **Phase 1** : Modèle de données + API de base (CRUD cercle)
- **Phase 2** : Check-in + cron d'expiration
- **Phase 3** : Trust level + UI
- **Phase 4** : Polish + tests E2E + a11y

Voir `plan.md` pour le découpage en tâches atomiques.
