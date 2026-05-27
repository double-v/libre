# Options de noms de domaine pour Libre — Mai 2026

> Document pour décider à la caisse. Prix en euros TTC sauf mention.

## Domaines gratuits

| Domaine | Service | Qualité perçue | Notes |
|---|---|---|---|
| `libre.is-a.dev` | is-a.dev (PR GitHub) | Bonne — tech/dev | Compatible Vercel (guide officiel), Cloudflare, 10k+ étoiles |
| `libre.eu.org` | eu.org | Moyenne — risques d'abus | Approbation manuelle (semaines/mois). Signalé pour abus frauduleux (Security Boulevard janv. 2026) |
| `libre.pp.ua` | nic.ua | Faible — ukrainien | 3 domaines max/30j, WHOIS public. Pas idéal public FR |
| `libre.us.kg` | DigitalPlat | Faible — inconnu | Suffixe peu professionnel |

**Recommandé gratuit :** `libre.is-a.dev` seul — les autres nuisent à la confiance.

## Domaines pas chers (< 10 €/an)

### TLD français / européens

| TLD | Registrar | 1re année | Renouvellement/an | Note |
|---|---|---|---|---|
| **.fr** | OVHcloud | ~6,76 € TTC | ~9,36 € TTC | **Le meilleur choix** — confiance max public FR |
| **.fr** | Inleed | ~7,50 € TTC | ~7,50 € TTC | Prix plat stable, registrar suède accrédité |
| **.eu** | Porkbun | ~1,68 € | ~4,76 € | Pas de WHOIS privé. Éligibilité UE requise |

### TLD génériques pas chers

| TLD | Registrar | 1re année | Renouvellement/an | Note |
|---|---|---|---|---|
| **.xyz** | Spaceship | ~0,90 € | ~11,73 € | Prix d'appel, renouvellement correct |
| **.app** | Sav.com | ~4,60 € | ~11,05 € | Parfait pour une app. HTTPS obligatoire |
| **.app** | Porkbun | ~8,05 € | ~11,85 € | Transparent, pas de piège |
| **.site** | Porkbun | ~3-5 € | ~7-10 € | Correct |

### TLD thématiques

| TLD | Registrar | 1re année | Renouvellement/an | Note |
|---|---|---|---|---|
| **.love** | Z.com | ~2,70 € | ~15,60 € | Pertinent mais renouvellement élevé |
| **.chat** | Sav.com | ~4,60 € | ~25,65 € | Renouvellement très élevé |
| **.dating** | Spaceship | ~10,68 € | ~48 € | Trop cher |

### ATTENTION — Renouvellement piège

| TLD | 1re année | Renouvellement | Piège |
|---|---|---|---|
| .online | ~0,84 € | ~31-34 € | x37 au renouvellement ! |
| .chat | ~4,60 € | ~25-27 € | x5 au renouvellement |

## Vérifications de disponibilité

### .fr

| Domaine | Statut | Commentaire |
|---|---|---|
| `rencontrelibre.fr` | **PRIS** | Site de rencontre actif existant |
| `rencontre-libre.fr` | **PRIS** | Blog existant |
| `libre-rencontre.fr` | Probablement dispo | Aucun site détecté |
| `rencontres-libre.fr` | Probablement dispo | Aucun site détecté |
| `app-libre.fr` | Probablement dispo | Aucun site détecté |
| `libredating.fr` | Probablement dispo | Aucun site détecté |
| `libre-rencontres.fr` | Probablement dispo | Aucun site détecté |
| `libre.fr` | Très probablement pris | Nom générique trop recherché |

### .eu

| Domaine | Statut |
|---|---|
| `rencontrelibre.eu` | Probablement dispo |
| `libre-rencontre.eu` | Probablement dispo |

### .app

| Domaine | Statut |
|---|---|
| `rencontrelibre.app` | Probablement dispo |
| `libre-rencontre.app` | Probablement dispo |
| `libredating.app` | Probablement dispo |

### Autres

| Domaine | Statut |
|---|---|
| `rencontrelibre.xyz` | Probablement dispo (~1 € 1re année) |
| `libre.love` | Probablement dispo |
| `rencontrelibre.love` | Probablement dispo |
| `rencontrelibre.chat` | Probablement dispo |

### .re (La Réunion — domain hack "lib.re")

| Domaine | Statut | Commentaire |
|---|---|---|
| `lib.re` | **PRIS** | Actif chez Hostinger (109.176.197.175), NS: chim.re/afraid.org. Domain hack "lib.re" = parfait mais déjà pris |
| `rencontrelibre.re` | Probablement dispo | .re = ~6 €/an chez OVH, éligibilité UE requise |

> Le .re est géré par l'AFNIC (comme le .fr). Prix : ~6-7 €/an chez OVH. Le domain hack `lib.re` était le graal mais il est déjà pris et actif.

### Déjà pris

| Domaine | Propriétaire |
|---|---|
| `libre.org` | Enregistré depuis 2001, expire 2028 |
| `libre.fr` | Très probablement pris |
| `libre.xyz` | Très probablement pris |
| `libre.app` | Très probablement pris |
| `libre.chat` | Très probablement pris |
| `libre.eu` | Très probablement pris |

## Stratégie recommandée — Budget ~7-10 €/an

1. **Prendre un .fr chez OVH** (~7-9 € TTC/an) — signal de confiance maximum pour le public FR
   - Candidats : `libre-rencontre.fr`, `app-libre.fr`, `libredating.fr`
2. **Prendre `libre.is-a.dev`** (gratuit) — domaine tech secondaire
3. **Optionnel : un .xyz ou .app pas cher** si budget restant

**Pourquoi le .fr d'abord :** Pour un public FR fatigué de payer Tinder, un .fr dit "c'est français, c'est sérieux, c'est pas une arnaque". C'est le signal de confiance le plus fort et il coûte moins de 10 €/an.

**Attention :** `rencontrelibre.fr` et `rencontre-libre.fr` sont déjà pris. Les variantes inversées (`libre-rencontre.fr`) ou avec "app" (`app-libre.fr`) semblent disponibles.

---

Sources : [OVHcloud .fr](https://www.ovhcloud.com/fr/domains/tld/fr/), [Porkbun](https://porkbun.com/), [Spaceship](https://www.spaceship.com/), [is-a.dev](https://github.com/is-a-dev/register/), [nic.eu.org](https://nic.eu.org/), [Security Boulevard .eu.org abus](https://securityboulevard.com/2026/01/you-see-an-email-ending-in-eu-org-must-be-legit-right/), [AFNIC .fr](https://xn--russir-en-b4a.fr/votre-adresse-internet-en-fr/)