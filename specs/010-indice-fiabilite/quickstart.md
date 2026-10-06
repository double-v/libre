# Quickstart — valider la spec 010

Prérequis : PostgreSQL local + seed + dev server,
jamais Neon. `.env` avec `NEXTAUTH_SECRET`.

```sh
npx prisma migrate dev          # base locale uniquement
npx vitest run src/lib/fraude src/__tests__/signaux-never-leak.test.ts
npm run dev
```

## Scénarios

1. **Blocages** : 3 comptes de plus de 7 jours (seed) bloquent X → X dans
   `/admin/profils`, signal « bloqué à répétition ». Avec 2 bloqueurs, ou un
   bloqueur de la veille → rien.
2. **Retour d'un banni** : bannir A ; inscrire B avec le même `deviceId`
   (localStorage `libre_device_id` recopié) → B porte « retour d'un compte
   banni » dès l'inscription. Idem avec l'e-mail `a+x@…` normalisé.
3. **Lexique** : bio « paiement par coupon PCS » → enregistrée, signal fort.
4. **Rafale** : compte neuf non vérifié, 15 likes en 10 min puis 30 sur la
   journée (script de seed) → bandeau d'invitation visible, entrée
   `INVITE_VERIFICATION` « Automatique » dans le journal ; le compte reste dans
   Découvrir d'un autre compte et peut écrire.
5. **Vérifié** : même scénario sur un compte badgé → pas de bandeau, présent
   dans la file.
6. **Badge** : approuver le selfie d'un invité → bandeau disparu.
7. **Faibles** : appareil partagé seul, fuseau `Africa/Lagos` + ville Lyon
   seul → aucun bandeau, pas de file ; les trois ensemble + IP groupées →
   niveau « douteux ».
8. **Admin › Membres** : filtre « douteux », tri par fiabilité ; fiche : liste
   des indices, mention « peut être légitime » sur les faibles.
9. **Non-fuite** : la garde passe ; `GET /api/users/[id]` d'un compte
   « douteux » ne contient ni `niveau`, ni `invitation`, ni signal.
10. **Pixels** : captures Playwright clair/sombre du bandeau (mobile 390 px,
    desktop 1080 px) et de la liste admin filtrée ; échantillonner plusieurs
    points du bandeau.
11. **Purge** : avancer l'horloge de test → traces d'inscription effacées à
    7 j, empreintes d'identité à 1 an.
