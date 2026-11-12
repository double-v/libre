# Sécurité — Spec 013 (modèle de menaces)

Le dépôt est public. Un attaquant connaît le code, la table des réseaux, les
termes cherchés dans les images et cette page. Ces indices ne reposent donc
sur aucun secret.

Leur valeur tient à deux choses. D'abord, un fraudeur doit penser à cacher
**trois choses à la fois** : le pays, le réseau et la déclaration de
l'image. Ensuite, aucun indice ne sanctionne : un faux positif coûte une
minute au modérateur, jamais un compte à un membre.

## Acteurs hostiles

| Acteur | Ce qu'il veut |
|---|---|
| **Brouteur** (arnaque sentimentale depuis l'étranger) | paraître vivre en France, avec des photos volées ou générées |
| **Robot d'inscription** | créer des comptes en masse depuis des serveurs |
| **Membre malveillant** | faire lever des indices sur le compte d'un autre, ou lire les siens |
| **Fichier piégé** | faire planter ou ralentir le téléversement, ou épuiser la mémoire de la fonction |
| **Source de données compromise** | glisser une table qui accuse des réseaux ordinaires ou blanchit des VPN |

## Menaces et parades

| # | Menace | Parade | Exigence | Test hostile |
|---|---|---|---|---|
| M1 | Coordonnées françaises avec un faux nom de pays, pour éviter l'indice de pays | `pays_ville` déduit des coordonnées d'abord (R4) ; le nom du client ne compte que hors de France | FR-002, FR-S03 | `city: { lat: 45.76, lng: 4.84, country: "Côte d'Ivoire" }` donne `pays_ville = FR`, puis l'indice avec une connexion `CI` |
| M2 | En-tête de pays forgé par le client | Seul `x-vercel-ip-country` est lu ; valeur validée ; contrôle au déploiement que Vercel l'écrase (R1). Le falsifier ne fait qu'éviter l'indice, comme un VPN | FR-S03 | `XX`, `T1`, `fr`, `FRA` et un tableau d'en-têtes donnent `null` ; `x-country`, `cf-ipcountry` et un champ du corps sont ignorés |
| M3 | Adresse forgée dans `x-forwarded-for` pour se faire classer « relais » | Vercel réécrit `x-forwarded-for` (doc) ; au pire, l'attaquant évite un indice faible | FR-S03 | — (comportement de la plateforme, contrôlé au déploiement avec R1) |
| M4 | Accuser autrui : lever un indice sur un autre compte | Les indices portent sur l'utilisateur **authentifié** de la requête (`session`, ou le compte que `authorize` vient de valider), jamais sur un identifiant reçu | FR-S02 | `authorize` en échec (mauvais mot de passe sur l'e-mail d'une victime, depuis un VPN) n'écrit **rien** sur la victime |
| M5 | Fuite de l'adresse ou du pays aux autres membres | Nouveaux champs privés, ajoutés à `city-label-never-leaks` ; aucune réponse de route ne change | FR-S01, FR-S02 | La garde de non-fuite ; réponses des routes identiques avec et sans en-tête étranger |
| M6 | Adresse dans les journaux | `observerConnexion` ne journalise que `err.name` ; aucune exception ne remonte avec l'adresse dans le message | FR-S01, SC-002 | Une base factice qui lève une erreur contenant l'adresse ; on capture `console.*` et on vérifie que l'adresse et le code pays n'y sont pas |
| M7 | Fichier piégé dans le lecteur d'IA (longueur démesurée, 10 000 segments, PNG tronqué, RIFF incohérent) | Parcours borné (2 Mo, 512 segments), arrêt à la première incohérence, `null` en cas de doute, aucune décompression | FR-S04, FR-S05 | Corpus de fichiers forgés : aucune exception, résultat `null`, temps < 20 ms chacun |
| M8 | Faux positif de déclaration d'IA (terme présent dans les pixels compressés, ou appareil qui signe ses photos) | Lecture des seuls segments de métadonnées ; termes exacts avec casse et borne de jeton ; `digitalCapture` et `computationalCapture` ne lèvent rien | FR-010, cas limite | Le terme placé dans les données après SOS (JPEG) ou dans `IDAT` (PNG) ne lève rien ; un manifeste `computationalCapture` ne lève rien |
| M9 | Table des réseaux empoisonnée (PR ou source compromise) | Table générée par script, avec les empreintes SHA-256 des sources dans le module ; revue du diff des comptes de plages ; tests d'invariants ; quelques adresses témoins (résolveurs publics de FAI français) qui doivent rester `null` | FR-009 | Test : les témoins « ordinaires » donnent `null`, un témoin d'hébergeur connu donne `hebergement`, un témoin du relais Apple donne `relais` |
| M10 | Table trop lourde pour l'offre Hobby (démarrage à froid, taille de fonction) | Budget de 1 Mo, au-delà duquel le générateur échoue ; poids mesuré dans `next build` | FR-S05, SC-003 | Le générateur échoue au-delà du budget (test du générateur) |
| M11 | Course : deux connexions simultanées créent deux fois le même indice, ou dépassent 8 pays | `@@unique([userId, cle])` ; ajout de pays en une requête SQL conditionnelle | FR-003 | `test:db` avec barrière : 2 connexions `CI` simultanées donnent 1 signal ; 9 pays en parallèle donnent 8 codes au plus |
| M12 | L'indice décide à la place du modérateur | Aucun geste automatique sinon l'invitation au selfie existante (règle `douteSerieux`) ; aucun refus d'inscription, de connexion ou de photo | FR-014, FR-017 | Une photo `generee` est stockée et visible ; une connexion depuis un hébergeur ouvre la session |

## Hors périmètre, constats à traiter à part

- **`consents.ip_address`** conserve l'adresse en clair à l'inscription, pour
  la traçabilité du consentement (R2). C'est légitime en principe, mais sa
  durée de conservation n'est pas fixée dans `regles.ts`. Décision à prendre
  par l'opérateur, dans un ticket séparé.
- **IPv6** n'est pas couvert par la table (R3). C'est une limite
  documentée, pas une faille : la conséquence est un indice manquant, jamais
  un indice à tort.
- **Images générées sans déclaration** : invisibles à cette spec. Ce sera le
  rôle du selfie en deux temps (#561).
