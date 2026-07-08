# Publier Libre sur le Play Store (voie TWA)

Libre est déjà un **PWA installable** (manifest complet, service worker, HTTPS via
Vercel). La voie la plus courte vers le Play Store n'est donc **pas** un rebuild
natif mais une **TWA** (Trusted Web Activity) : une coquille Android qui ouvre
`https://www.getlibre.fr` en plein écran, sans barre d'URL, et se met à jour en
même temps que le site.

Ce document est la checklist pas-à-pas. Les deux artefacts techniques vivent déjà
dans le repo :

- `public/.well-known/assetlinks.json` — scaffold Digital Asset Links (voir §5).
- `public/manifest.json` — source de vérité (nom, icônes, couleurs, screenshots).

> **Deux valeurs restent des placeholders** tant que l'AAB n'est pas généré :
> le **`package_name`** et le **SHA-256** de la clé de signature. Les deux
> sortent à l'étape §2 et se reportent en §5.

---

## 1. Prérequis (à valider AVANT de générer quoi que ce soit)

- [ ] **Compte Google Play Console** créé (frais uniques **25 $**, carte requise).
      Compte *développeur* perso ou société — pour une app de rencontre, un compte
      société est plus solide juridiquement.
- [ ] **URL de politique de confidentialité publique et stable** (obligatoire pour
      toute app, *a fortiori* dating). Vérifier qu'une page dédiée existe et
      couvre : géolocalisation, messages, photos, suppression de compte (RGPD).
      Le pied de page expose déjà `/cgu` ; s'assurer qu'une page
      **confidentialité** distincte est en ligne et référencée.
- [ ] **Manifest à jour** (`public/manifest.json`) : `name`, `short_name`,
      `theme_color` (`#E8634A`), `background_color`, icônes 48→512 **+ maskable**,
      `screenshots` narrow + wide. ✅ déjà en place.
- [ ] **Critères d'installabilité PWA OK** : HTTPS (Vercel), service worker
      (`public/sw.js`), `start_url`, `display: standalone`. ✅ déjà en place.

## 2. Générer l'AAB (Android App Bundle)

Deux outils, au choix. **PWABuilder** est le plus rapide (cf. #11).

### Option A — PWABuilder (recommandé, no-code)

1. Aller sur https://www.pwabuilder.com et saisir `https://www.getlibre.fr`.
2. Vérifier le score PWA (manifest / service worker / sécurité) — corriger les
   éventuels avertissements avant de packager.
3. **Package For Stores → Android → Google Play**.
4. Renseigner :
   - **Package ID** : `fr.getlibre.twa` (⚠️ **définitif et immuable** une fois
     publié — le reporter tel quel dans `assetlinks.json`, §5).
   - **App name** : `Libre`.
   - **Signing key** : laisser PWABuilder **générer** une nouvelle clé, puis
     **télécharger et sauvegarder** le `.keystore` + le mot de passe **hors du
     repo** (perte = impossibilité de mettre à jour l'app). Idéalement, activer
     **Play App Signing** (Google garde la clé de release ; on ne gère que la
     clé d'upload).
5. Télécharger le zip : il contient l'**AAB** (`.aab`), le **SHA-256** de la clé
   (`signing-key-info.txt` ou équivalent) et un `assetlinks.json` de référence.

### Option B — Bubblewrap (CLI, plus de contrôle)

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://www.getlibre.fr/manifest.json
bubblewrap build            # produit app-release-bundle.aab + la clé
bubblewrap fingerprint      # affiche le SHA-256 à reporter dans assetlinks.json
```

## 3. Digital Asset Links (lier le domaine ↔ l'app)

C'est ce qui **enlève la barre d'URL** et prouve à Android qu'on est bien
propriétaire de `www.getlibre.fr`.

- [ ] Récupérer le **SHA-256** de la clé de signature (§2 — PWABuilder le fournit ;
      Bubblewrap via `bubblewrap fingerprint`). Avec Play App Signing, prendre le
      SHA-256 **de la clé de signature d'app** affiché dans la Play Console
      (**Configuration → Intégrité de l'app**), pas seulement celui de la clé
      d'upload.
- [ ] Éditer `public/.well-known/assetlinks.json` : remplacer
      `REMPLACER_PAR_LE_SHA256_DE_LA_CLE_DE_SIGNATURE` par le vrai fingerprint, et
      vérifier que `package_name` correspond exactement au **Package ID** de §2.
- [ ] Déployer, puis vérifier que le fichier est servi **en clair** et en
      `application/json` :
      `curl https://www.getlibre.fr/.well-known/assetlinks.json`.
- [ ] Valider avec l'outil Google :
      https://developers.google.com/digital-asset-links/tools/generator

## 4. Créer la fiche Play Console

- [ ] **Nouvelle application** : nom `Libre`, langue par défaut `français`, type
      **App**, **gratuite**.
- [ ] **Fiche principale** : titre, description courte, description longue (repartir
      du `description` du manifest et de la copy marketing du site), icône 512×512,
      feature graphic 1024×500, **screenshots téléphone** (réutiliser
      `screenshot-narrow.png` ou en refaire de plus soignés).
- [ ] **Catégorie** : `Rencontres` (Lifestyle / Social selon la taxonomie Play).
- [ ] **Upload de l'AAB** dans un canal de test (**Test interne** d'abord, pas
      Production) pour itérer sans review publique.

## 5. Conformité (le plus strict pour une app de rencontre)

Google review les apps de dating **plus sévèrement**. Ne rien déclarer à la légère.

- [ ] **Classification du contenu** : remplir le questionnaire → cible **18+**
      (rencontres, chat non modéré a priori). Déclaration honnête obligatoire.
- [ ] **Data safety** (formulaire obligatoire) — déclarer la collecte et l'usage :
      - **Localisation** (géoloc « à proximité » / crossings) ;
      - **Messages** (chat 1:1, La Place) ;
      - **Photos** (profil) ;
      - **Identité** (email, profil).
      Préciser chiffrement en transit, et si l'utilisateur peut demander la
      suppression (RGPD — cf. #160 suppression de compte).
- [ ] **Politique de confidentialité** : coller l'URL publique (§1).
- [ ] **Signalement d'abus & modération** : Play exige des mécanismes visibles de
      signalement et de blocage. Vérifier la couverture actuelle (cf. #151
      modération automatique, #36 audit global) et documenter ce qui existe.
- [ ] **Compte de test** : fournir à Google un compte de démo fonctionnel (login
      + parcours), sinon la review est rejetée.

## 6. Publication

- [ ] Valider le parcours complet en **Test interne** (installer via le lien, se
      connecter, vérifier l'absence de barre d'URL = assetlinks OK).
- [ ] Promouvoir vers **Test fermé** (beta) si besoin d'un panel, sinon
      **Production**.
- [ ] Soumettre à review. Délai typique : quelques jours (dating = plus long).
- [ ] **Sauvegarder** le keystore / les identifiants Play App Signing hors repo.

---

## Refs

- #11 — PWA, retour PWABuilder
- #196 — ce chantier (docs + scaffold `assetlinks.json`)
- #151 — modération automatique (prérequis conformité Play)
- #160 — suppression de compte RGPD (Data safety)
- `public/manifest.json`, `public/sw.js`, `public/.well-known/assetlinks.json`
