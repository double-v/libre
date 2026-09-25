/**
 * Banque de questions de profil (spec 009) — **validée par l'opérateur le
 * 2026-09-25** (revue interactive : 104 validées, 7 rejetées, 7 reformulées).
 *
 * Elle vit dans le code et se modifie par PR (clarification FR-001) : la
 * **clé** d'une question ou d'une option est ce qui est stocké en base, elle
 * ne change jamais de sens ; l'intitulé et l'aide se reformulent librement.
 * Retirer une question = `retired: true` (plus proposée, réponses existantes
 * affichées). Typographie : espace insécable avant « ? » et à l'intérieur des
 * guillemets, sinon le signe part seul à la ligne sur mobile.
 *
 * Aucune question de santé, politique, religion, sexualité ou argent (la
 * politique relève de la spec 010, avec son cadre RGPD art. 9). La question
 * `habitudes` est en texte libre : son aide ne cite que des produits légaux
 * et n'incite à rien (décision opérateur).
 */

export type QuestionFormat = 'ouverte' | 'choix' | 'ceci-ou-cela';

export interface QuestionOption {
  key: string;
  label: string;
  /** Choix multiple seulement : la choisir retire les autres réponses. */
  exclusive?: true;
}

export interface Question {
  key: string;
  theme: string;
  format: QuestionFormat;
  label: string;
  /** Choix multiple (format `choix` seulement). */
  multiple?: true;
  options?: QuestionOption[];
  /** Aide affichée sous le champ de saisie. */
  hint?: string;
  retired?: true;
}

export interface Theme {
  key: string;
  label: string;
}

export const THEMES: readonly Theme[] = [
  {
    "key": "quotidien",
    "label": "Au quotidien"
  },
  {
    "key": "culture",
    "label": "Goûts & culture"
  },
  {
    "key": "rire",
    "label": "Rire & légèreté"
  },
  {
    "key": "liens",
    "label": "Liens & relations"
  },
  {
    "key": "valeurs",
    "label": "Façon de voir"
  },
  {
    "key": "envies",
    "label": "Envies & rêves"
  },
  {
    "key": "souvenirs",
    "label": "Souvenirs"
  },
  {
    "key": "habitudes",
    "label": "Habitudes"
  },
  {
    "key": "rencontre",
    "label": "Pour se rencontrer"
  },
  {
    "key": "ceci-ou-cela",
    "label": "Ceci ou cela"
  }
];

export const QUESTIONS: readonly Question[] = [
  {
    "key": "dimanche-ideal",
    "theme": "quotidien",
    "label": "Un dimanche idéal, ça ressemble à quoi ?",
    "format": "ouverte"
  },
  {
    "key": "petit-plaisir",
    "theme": "quotidien",
    "label": "Ton petit plaisir du quotidien ?",
    "format": "ouverte"
  },
  {
    "key": "matin-ou-soir",
    "theme": "quotidien",
    "label": "Tu as plus d’énergie le matin ou le soir ?",
    "format": "choix",
    "options": [
      {
        "key": "le-matin",
        "label": "Le matin"
      },
      {
        "key": "le-soir",
        "label": "Le soir"
      },
      {
        "key": "ca-depend-des-jours",
        "label": "Ça dépend des jours"
      }
    ]
  },
  {
    "key": "heure-libre",
    "theme": "quotidien",
    "label": "Une heure devant toi, tu en fais quoi ?",
    "format": "ouverte"
  },
  {
    "key": "rituel",
    "theme": "quotidien",
    "label": "Un rituel auquel tu tiens ?",
    "format": "ouverte"
  },
  {
    "key": "bruit-de-fond",
    "theme": "quotidien",
    "label": "Chez toi, qu’est-ce qui tourne en fond : musique, podcast, silence ?",
    "format": "choix",
    "multiple": true,
    "options": [
      {
        "key": "musique",
        "label": "Musique"
      },
      {
        "key": "podcast",
        "label": "Podcast"
      },
      {
        "key": "radio",
        "label": "Radio"
      },
      {
        "key": "silence",
        "label": "Silence"
      }
    ]
  },
  {
    "key": "plat-reconfort",
    "theme": "quotidien",
    "label": "Le plat qui te réconforte ?",
    "format": "ouverte"
  },
  {
    "key": "cuisine-plaisir",
    "theme": "quotidien",
    "label": "Ce que tu cuisines quand tu veux faire plaisir ?",
    "format": "ouverte"
  },
  {
    "key": "endroit-reflechir",
    "theme": "quotidien",
    "label": "Ton endroit préféré pour réfléchir ?",
    "format": "ouverte"
  },
  {
    "key": "objet-fetiche",
    "theme": "quotidien",
    "label": "Un objet dont tu ne te sépares pas ?",
    "format": "ouverte"
  },
  {
    "key": "derniere-decouverte",
    "theme": "quotidien",
    "label": "Ta dernière petite découverte ?",
    "format": "ouverte"
  },
  {
    "key": "jour-de-pluie",
    "theme": "quotidien",
    "label": "Un jour de pluie, idéalement ?",
    "format": "choix",
    "multiple": true,
    "options": [
      {
        "key": "sous-un-plaid",
        "label": "Sous un plaid"
      },
      {
        "key": "dehors-quand-meme",
        "label": "Dehors quand même"
      },
      {
        "key": "au-cafe",
        "label": "Au café"
      },
      {
        "key": "au-lit",
        "label": "Au lit"
      }
    ]
  },
  {
    "key": "chanson",
    "theme": "culture",
    "label": "Une chanson que tu ne te lasses pas d’écouter ?",
    "format": "ouverte"
  },
  {
    "key": "oeuvre-marquante",
    "theme": "culture",
    "label": "Un livre, un film ou une série qui t’a marqué·e ?",
    "format": "ouverte"
  },
  {
    "key": "revoir-dix-fois",
    "theme": "culture",
    "label": "Ce que tu pourrais relire ou revoir dix fois ?",
    "format": "ouverte"
  },
  {
    "key": "plaisir-coupable",
    "theme": "culture",
    "label": "Un plaisir coupable, côté culture ?",
    "format": "ouverte"
  },
  {
    "key": "artiste-a-decouvrir",
    "theme": "culture",
    "label": "Un·e artiste que tu aimerais faire découvrir ?",
    "format": "ouverte"
  },
  {
    "key": "bande-son",
    "theme": "culture",
    "label": "La bande-son de ta vie en ce moment ?",
    "format": "ouverte"
  },
  {
    "key": "personnage",
    "theme": "culture",
    "label": "Un personnage de fiction dont tu te sens proche ?",
    "format": "ouverte"
  },
  {
    "key": "derniere-claque",
    "theme": "culture",
    "label": "La dernière œuvre qui t’a mis une claque ?",
    "format": "ouverte"
  },
  {
    "key": "jeu",
    "theme": "culture",
    "label": "À quels jeux aimes-tu jouer ?",
    "format": "choix",
    "multiple": true,
    "options": [
      {
        "key": "jeux-de-societe",
        "label": "Jeux de société"
      },
      {
        "key": "jeux-video",
        "label": "Jeux vidéo"
      },
      {
        "key": "jeux-de-mots",
        "label": "Jeux de mots"
      },
      {
        "key": "jeux-de-cartes",
        "label": "Jeux de cartes"
      },
      {
        "key": "je-ne-suis-pas-trop-joueur-se",
        "label": "Je ne suis pas trop joueur·se",
        "exclusive": true
      }
    ]
  },
  {
    "key": "a-recommander",
    "theme": "culture",
    "label": "Un podcast, une chaîne ou une newsletter à recommander ?",
    "format": "ouverte"
  },
  {
    "key": "citation",
    "theme": "culture",
    "label": "Une phrase ou une citation qui te suit ?",
    "format": "ouverte"
  },
  {
    "key": "musee",
    "theme": "culture",
    "label": "Si tu avais ton musée, on y verrait quoi ?",
    "format": "ouverte"
  },
  {
    "key": "fait-rire",
    "theme": "rire",
    "label": "Qu’est-ce qui te fait rire à coup sûr ?",
    "format": "ouverte"
  },
  {
    "key": "dernier-sourire",
    "theme": "rire",
    "label": "La dernière chose qui t’a donné le sourire ?",
    "format": "ouverte"
  },
  {
    "key": "talent-inutile",
    "theme": "rire",
    "label": "Un talent parfaitement inutile dont tu es fier·e ?",
    "format": "ouverte"
  },
  {
    "key": "blague",
    "theme": "rire",
    "label": "Ta meilleure (ou ta pire) blague ?",
    "format": "ouverte"
  },
  {
    "key": "anecdote",
    "theme": "rire",
    "label": "Une anecdote que tu racontes souvent ?",
    "format": "ouverte"
  },
  {
    "key": "unpopular-opinion",
    "theme": "rire",
    "label": "Quel avis défends-tu alors que presque personne n’est d’accord ?",
    "format": "ouverte",
    "hint": "C’est ton unpopular opinion. Par exemple : l’ananas sur la pizza, c’est très bien."
  },
  {
    "key": "super-pouvoir",
    "theme": "rire",
    "label": "Un super-pouvoir modeste que tu aimerais avoir ?",
    "format": "choix",
    "options": [
      {
        "key": "ne-jamais-avoir-froid",
        "label": "Ne jamais avoir froid"
      },
      {
        "key": "retrouver-ses-cles",
        "label": "Retrouver ses clés"
      },
      {
        "key": "toujours-avoir-du-reseau",
        "label": "Toujours avoir du réseau"
      },
      {
        "key": "autre",
        "label": "Autre"
      }
    ]
  },
  {
    "key": "animal",
    "theme": "rire",
    "label": "Si tu étais un animal, lequel, et pourquoi ?",
    "format": "choix",
    "options": [
      {
        "key": "chat",
        "label": "Chat"
      },
      {
        "key": "chien",
        "label": "Chien"
      },
      {
        "key": "oiseau",
        "label": "Oiseau"
      },
      {
        "key": "poisson",
        "label": "Poisson"
      },
      {
        "key": "autre-precise",
        "label": "Autre (précise !)"
      }
    ]
  },
  {
    "key": "mot-prefere",
    "theme": "rire",
    "label": "Ton mot préféré, et pourquoi ?",
    "format": "ouverte"
  },
  {
    "key": "expression",
    "theme": "rire",
    "label": "Une expression que tu dis tout le temps ?",
    "format": "ouverte"
  },
  {
    "key": "petite-honte",
    "theme": "rire",
    "label": "Une petite honte qui te fait rire aujourd’hui ?",
    "format": "ouverte"
  },
  {
    "key": "touche-chez-quelquun",
    "theme": "liens",
    "label": "Ce qui te touche chez quelqu’un ?",
    "format": "ouverte"
  },
  {
    "key": "en-amitie",
    "theme": "liens",
    "label": "Ce que tu apportes dans une amitié ?",
    "format": "ouverte"
  },
  {
    "key": "petite-attention",
    "theme": "liens",
    "label": "Une petite attention qui te fait fondre ?",
    "format": "ouverte"
  },
  {
    "key": "apres-desaccord",
    "theme": "liens",
    "label": "Après un désaccord, tu fais comment ?",
    "format": "choix",
    "options": [
      {
        "key": "j-en-parle-tout-de-suite",
        "label": "J’en parle tout de suite"
      },
      {
        "key": "j-ai-besoin-d-un-temps",
        "label": "J’ai besoin d’un temps"
      },
      {
        "key": "ca-depend",
        "label": "Ça dépend"
      }
    ]
  },
  {
    "key": "quand-ca-va-pas",
    "theme": "liens",
    "label": "Quand ça ne va pas, qu’est-ce qui t’aide ?",
    "format": "ouverte"
  },
  {
    "key": "tenir-a-quelquun",
    "theme": "liens",
    "label": "À quoi on reconnaît que tu tiens à quelqu’un ?",
    "format": "ouverte"
  },
  {
    "key": "silence-a-deux",
    "theme": "liens",
    "label": "Le silence avec quelqu’un : confortable ou pas ?",
    "format": "choix",
    "options": [
      {
        "key": "confortable",
        "label": "Confortable"
      },
      {
        "key": "ca-depend",
        "label": "Ça dépend"
      },
      {
        "key": "pas-trop",
        "label": "Pas trop"
      }
    ]
  },
  {
    "key": "libre-a-deux",
    "theme": "liens",
    "label": "« Être libre à deux », ça veut dire quoi pour toi ?",
    "format": "ouverte"
  },
  {
    "key": "rythme",
    "theme": "liens",
    "label": "Ton rythme idéal pour faire connaissance ?",
    "format": "choix",
    "options": [
      {
        "key": "doucement",
        "label": "Doucement"
      },
      {
        "key": "au-feeling",
        "label": "Au feeling"
      },
      {
        "key": "sans-tarder",
        "label": "Sans tarder"
      }
    ]
  },
  {
    "key": "red-flag",
    "theme": "liens",
    "label": "Quel est ton red flag ?",
    "format": "ouverte",
    "hint": "Un red flag, c’est un signal d’alerte : un comportement qui te fait prendre tes distances."
  },
  {
    "key": "conviction-changee",
    "theme": "valeurs",
    "label": "Une conviction qui a changé avec le temps ?",
    "format": "ouverte"
  },
  {
    "key": "fierte-discrete",
    "theme": "valeurs",
    "label": "Une chose dont tu es fier·e sans le crier ?",
    "format": "ouverte"
  },
  {
    "key": "agace",
    "theme": "valeurs",
    "label": "Une petite chose du quotidien qui t’agace ?",
    "format": "ouverte"
  },
  {
    "key": "echec-appris",
    "theme": "valeurs",
    "label": "Ce qu’un échec t’a appris ?",
    "format": "ouverte"
  },
  {
    "key": "prendre-son-temps",
    "theme": "valeurs",
    "label": "Ce que tu refuses de faire vite ?",
    "format": "ouverte"
  },
  {
    "key": "regle-perso",
    "theme": "valeurs",
    "label": "Une règle que tu t’es fixée ?",
    "format": "ouverte"
  },
  {
    "key": "changer-avis",
    "theme": "valeurs",
    "label": "Qu’est-ce qui peut te faire changer d’avis ?",
    "format": "ouverte"
  },
  {
    "key": "compte-moins",
    "theme": "valeurs",
    "label": "Une chose qui compte moins pour toi qu’avant ?",
    "format": "ouverte"
  },
  {
    "key": "meilleur-conseil",
    "theme": "valeurs",
    "label": "Le meilleur conseil qu’on t’ait donné ?",
    "format": "ouverte"
  },
  {
    "key": "apprendre",
    "theme": "envies",
    "label": "Une chose que tu aimerais apprendre ?",
    "format": "ouverte"
  },
  {
    "key": "curieux-en-ce-moment",
    "theme": "envies",
    "label": "Qu’est-ce qui te rend curieux·se en ce moment ?",
    "format": "ouverte"
  },
  {
    "key": "projet",
    "theme": "envies",
    "label": "Un projet qui te tient à cœur ?",
    "format": "ouverte"
  },
  {
    "key": "tout-le-temps",
    "theme": "envies",
    "label": "Si tu avais tout le temps du monde, tu ferais quoi ?",
    "format": "ouverte"
  },
  {
    "key": "lieu-reve",
    "theme": "envies",
    "label": "Un lieu, réel ou imaginaire, où tu aimerais être là, tout de suite ?",
    "format": "ouverte"
  },
  {
    "key": "dans-quelques-annees",
    "theme": "envies",
    "label": "Toi dans quelques années, idéalement ?",
    "format": "ouverte"
  },
  {
    "key": "pas-encore-ose",
    "theme": "envies",
    "label": "Une chose que tu n’as pas encore osé faire ?",
    "format": "ouverte"
  },
  {
    "key": "collection",
    "theme": "envies",
    "label": "Ce que tu collectionnes, ou aimerais collectionner ?",
    "format": "ouverte"
  },
  {
    "key": "creer",
    "theme": "envies",
    "label": "Ce que tu aimes créer, fabriquer, bricoler ?",
    "format": "ouverte"
  },
  {
    "key": "journee-parfaite",
    "theme": "envies",
    "label": "Une journée parfaite, du matin au soir ?",
    "format": "ouverte"
  },
  {
    "key": "odeur-souvenir",
    "theme": "souvenirs",
    "label": "Une odeur qui te ramène à un souvenir ?",
    "format": "ouverte"
  },
  {
    "key": "souvenir-enfance",
    "theme": "souvenirs",
    "label": "Un souvenir d’enfance qui te fait sourire ?",
    "format": "ouverte"
  },
  {
    "key": "petite-victoire",
    "theme": "souvenirs",
    "label": "Une petite victoire récente ?",
    "format": "ouverte"
  },
  {
    "key": "annee-a-revivre",
    "theme": "souvenirs",
    "label": "Une année que tu revivrais ?",
    "format": "ouverte"
  },
  {
    "key": "fou-rire",
    "theme": "souvenirs",
    "label": "Ton plus grand fou rire ?",
    "format": "ouverte"
  },
  {
    "key": "plus-beau-cadeau",
    "theme": "souvenirs",
    "label": "Le plus beau cadeau reçu (ou fait) ?",
    "format": "ouverte"
  },
  {
    "key": "habitudes",
    "theme": "habitudes",
    "label": "Côté habitudes, tu te situes où ?",
    "format": "ouverte",
    "hint": "Tu peux parler par exemple du café, de l’alcool, du tabac ou du CBD. Tu en dis ce que tu veux, et rien ne t’oblige à répondre."
  },
  {
    "key": "cafe-the",
    "theme": "habitudes",
    "label": "Café, thé, ou autre chose ?",
    "format": "choix",
    "multiple": true,
    "options": [
      {
        "key": "cafe",
        "label": "Café"
      },
      {
        "key": "the",
        "label": "Thé"
      },
      {
        "key": "tisane",
        "label": "Tisane"
      },
      {
        "key": "chocolat-chaud",
        "label": "Chocolat chaud"
      },
      {
        "key": "aucun-des-quatre",
        "label": "Aucun des quatre",
        "exclusive": true
      }
    ]
  },
  {
    "key": "couche-tot-tard",
    "theme": "habitudes",
    "label": "Couche-tôt ou couche-tard ?",
    "format": "choix",
    "options": [
      {
        "key": "couche-tot",
        "label": "Couche-tôt"
      },
      {
        "key": "couche-tard",
        "label": "Couche-tard"
      },
      {
        "key": "ca-depend",
        "label": "Ça dépend"
      }
    ]
  },
  {
    "key": "ecrans",
    "theme": "habitudes",
    "label": "Ton rapport aux écrans ?",
    "format": "choix",
    "options": [
      {
        "key": "j-en-decroche-facilement",
        "label": "J’en décroche facilement"
      },
      {
        "key": "toujours-connecte-e",
        "label": "Toujours connecté·e"
      },
      {
        "key": "je-fais-des-pauses-expres",
        "label": "Je fais des pauses exprès"
      }
    ]
  },
  {
    "key": "range-desordre",
    "theme": "habitudes",
    "label": "Plutôt rangé·e ou joyeux désordre ?",
    "format": "choix",
    "options": [
      {
        "key": "range-e",
        "label": "Rangé·e"
      },
      {
        "key": "joyeux-desordre",
        "label": "Joyeux désordre"
      },
      {
        "key": "range-e-en-surface",
        "label": "Rangé·e en surface"
      }
    ]
  },
  {
    "key": "planifier-improviser",
    "theme": "habitudes",
    "label": "Tout planifier ou improviser ?",
    "format": "choix",
    "options": [
      {
        "key": "je-planifie",
        "label": "Je planifie"
      },
      {
        "key": "j-improvise",
        "label": "J’improvise"
      },
      {
        "key": "un-peu-des-deux",
        "label": "Un peu des deux"
      }
    ]
  },
  {
    "key": "soiree-ideale",
    "theme": "habitudes",
    "label": "Une soirée idéale, elle se passe où ?",
    "format": "choix",
    "multiple": true,
    "options": [
      {
        "key": "chez-moi",
        "label": "Chez moi"
      },
      {
        "key": "chez-des-proches",
        "label": "Chez des proches"
      },
      {
        "key": "dehors",
        "label": "Dehors"
      },
      {
        "key": "peu-importe-le-lieu-tant-que-la-compagni",
        "label": "Peu importe le lieu, tant que la compagnie est bonne",
        "exclusive": true
      }
    ]
  },
  {
    "key": "animaux",
    "theme": "habitudes",
    "label": "Les animaux et toi ?",
    "format": "choix",
    "options": [
      {
        "key": "j-en-ai",
        "label": "J’en ai"
      },
      {
        "key": "j-aimerais-en-avoir",
        "label": "J’aimerais en avoir"
      },
      {
        "key": "plutot-ceux-des-autres",
        "label": "Plutôt ceux des autres"
      },
      {
        "key": "pas-trop-mon-truc",
        "label": "Pas trop mon truc"
      }
    ]
  },
  {
    "key": "plantes",
    "theme": "habitudes",
    "label": "Main verte ou cimetière à plantes ?",
    "format": "choix",
    "options": [
      {
        "key": "main-verte",
        "label": "Main verte"
      },
      {
        "key": "en-progres",
        "label": "En progrès"
      },
      {
        "key": "cimetiere-a-plantes",
        "label": "Cimetière à plantes"
      }
    ]
  },
  {
    "key": "appel-ou-message",
    "theme": "habitudes",
    "label": "Appel, vocal ou message ?",
    "format": "choix",
    "multiple": true,
    "options": [
      {
        "key": "appel",
        "label": "Appel"
      },
      {
        "key": "vocal",
        "label": "Vocal"
      },
      {
        "key": "message",
        "label": "Message"
      },
      {
        "key": "visio",
        "label": "Visio"
      }
    ]
  },
  {
    "key": "premier-message",
    "theme": "rencontre",
    "label": "Un premier message qui te donnerait envie de répondre ?",
    "format": "ouverte"
  },
  {
    "key": "premiere-conversation",
    "theme": "rencontre",
    "label": "Une première conversation réussie, ça ressemble à quoi ?",
    "format": "ouverte"
  },
  {
    "key": "on-s-entendra-si",
    "theme": "rencontre",
    "label": "On s’entendra bien si…",
    "format": "ouverte"
  },
  {
    "key": "moins-bien-si",
    "theme": "rencontre",
    "label": "On risque de moins s’entendre si…",
    "format": "ouverte"
  },
  {
    "key": "ce-que-j-espere",
    "theme": "rencontre",
    "label": "Ce que tu espères trouver ici ?",
    "format": "ouverte"
  },
  {
    "key": "me-connaitre",
    "theme": "rencontre",
    "label": "Le meilleur moyen de te connaître ?",
    "format": "ouverte"
  },
  {
    "key": "question-a-poser",
    "theme": "rencontre",
    "label": "Une question que tu aimerais qu’on te pose ?",
    "format": "ouverte"
  },
  {
    "key": "confiance",
    "theme": "rencontre",
    "label": "Quel est ton green flag ?",
    "format": "ouverte",
    "hint": "Un green flag, c’est un signe qui te met en confiance chez quelqu’un. Par exemple : quelqu’un qui tient parole."
  },
  {
    "key": "partager",
    "theme": "rencontre",
    "label": "Une chose que tu aimerais partager avec quelqu’un ?",
    "format": "ouverte"
  },
  {
    "key": "mer-montagne",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Mer ou montagne",
    "options": [
      {
        "key": "mer",
        "label": "Mer"
      },
      {
        "key": "montagne",
        "label": "Montagne"
      }
    ]
  },
  {
    "key": "chat-chien",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Chat ou chien",
    "options": [
      {
        "key": "chat",
        "label": "Chat"
      },
      {
        "key": "chien",
        "label": "Chien"
      }
    ]
  },
  {
    "key": "sale-sucre",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Salé ou sucré",
    "options": [
      {
        "key": "sale",
        "label": "Salé"
      },
      {
        "key": "sucre",
        "label": "Sucré"
      }
    ]
  },
  {
    "key": "livre-film",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Livre ou film",
    "options": [
      {
        "key": "livre",
        "label": "Livre"
      },
      {
        "key": "film",
        "label": "Film"
      }
    ]
  },
  {
    "key": "lever-coucher",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Lever de soleil ou coucher de soleil",
    "options": [
      {
        "key": "lever-de-soleil",
        "label": "Lever de soleil"
      },
      {
        "key": "coucher-de-soleil",
        "label": "Coucher de soleil"
      }
    ]
  },
  {
    "key": "ville-campagne",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Ville ou campagne",
    "options": [
      {
        "key": "ville",
        "label": "Ville"
      },
      {
        "key": "campagne",
        "label": "Campagne"
      }
    ]
  },
  {
    "key": "ete-hiver",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Été ou hiver",
    "options": [
      {
        "key": "ete",
        "label": "Été"
      },
      {
        "key": "hiver",
        "label": "Hiver"
      }
    ]
  },
  {
    "key": "karaoke-blindtest",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Karaoké ou blind test",
    "options": [
      {
        "key": "karaoke",
        "label": "Karaoké"
      },
      {
        "key": "blind-test",
        "label": "Blind test"
      }
    ]
  },
  {
    "key": "pizza-sushi",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Pizza ou sushi",
    "options": [
      {
        "key": "pizza",
        "label": "Pizza"
      },
      {
        "key": "sushi",
        "label": "Sushi"
      }
    ]
  },
  {
    "key": "spoilers",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Spoilers : jamais ou spoilers : m’en fiche",
    "options": [
      {
        "key": "spoilers-jamais",
        "label": "Spoilers : jamais"
      },
      {
        "key": "spoilers-m-en-fiche",
        "label": "Spoilers : m’en fiche"
      }
    ]
  },
  {
    "key": "dessert-fromage",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Dessert ou fromage",
    "options": [
      {
        "key": "dessert",
        "label": "Dessert"
      },
      {
        "key": "fromage",
        "label": "Fromage"
      }
    ]
  },
  {
    "key": "pluie-soleil",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Pluie ou soleil",
    "options": [
      {
        "key": "pluie",
        "label": "Pluie"
      },
      {
        "key": "soleil",
        "label": "Soleil"
      }
    ]
  },
  {
    "key": "serie-longue-courte",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Série à rallonge ou mini-série",
    "options": [
      {
        "key": "serie-a-rallonge",
        "label": "Série à rallonge"
      },
      {
        "key": "mini-serie",
        "label": "Mini-série"
      }
    ]
  },
  {
    "key": "gagner-participer",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Jouer pour gagner ou jouer pour jouer",
    "options": [
      {
        "key": "jouer-pour-gagner",
        "label": "Jouer pour gagner"
      },
      {
        "key": "jouer-pour-jouer",
        "label": "Jouer pour jouer"
      }
    ]
  },
  {
    "key": "papier-numerique",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Livre papier ou liseuse",
    "options": [
      {
        "key": "livre-papier",
        "label": "Livre papier"
      },
      {
        "key": "liseuse",
        "label": "Liseuse"
      }
    ]
  },
  {
    "key": "brunch-diner",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Brunch ou dîner",
    "options": [
      {
        "key": "brunch",
        "label": "Brunch"
      },
      {
        "key": "diner",
        "label": "Dîner"
      }
    ]
  },
  {
    "key": "matin-bavard",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Matin silencieux ou matin bavard",
    "options": [
      {
        "key": "matin-silencieux",
        "label": "Matin silencieux"
      },
      {
        "key": "matin-bavard",
        "label": "Matin bavard"
      }
    ]
  },
  {
    "key": "mots-croises-sudoku",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Mots croisés ou sudoku",
    "options": [
      {
        "key": "mots-croises",
        "label": "Mots croisés"
      },
      {
        "key": "sudoku",
        "label": "Sudoku"
      }
    ]
  },
  {
    "key": "classique-nouveaute",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Classiques ou nouveautés",
    "options": [
      {
        "key": "classiques",
        "label": "Classiques"
      },
      {
        "key": "nouveautes",
        "label": "Nouveautés"
      }
    ]
  },
  {
    "key": "groupe-comite",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Grande tablée ou petit comité",
    "options": [
      {
        "key": "grande-tablee",
        "label": "Grande tablée"
      },
      {
        "key": "petit-comite",
        "label": "Petit comité"
      }
    ]
  },
  {
    "key": "garder-jeter",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Tout garder ou tout jeter",
    "options": [
      {
        "key": "tout-garder",
        "label": "Tout garder"
      },
      {
        "key": "tout-jeter",
        "label": "Tout jeter"
      }
    ]
  },
  {
    "key": "recette-au-pif",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Recette ou au pif",
    "options": [
      {
        "key": "recette",
        "label": "Recette"
      },
      {
        "key": "au-pif",
        "label": "Au pif"
      }
    ]
  },
  {
    "key": "leve-tot-grasse-mat",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Lève-tôt ou grasse matinée",
    "options": [
      {
        "key": "leve-tot",
        "label": "Lève-tôt"
      },
      {
        "key": "grasse-matinee",
        "label": "Grasse matinée"
      }
    ]
  },
  {
    "key": "message-long-court",
    "theme": "ceci-ou-cela",
    "format": "ceci-ou-cela",
    "label": "Messages longs ou messages courts",
    "options": [
      {
        "key": "messages-longs",
        "label": "Messages longs"
      },
      {
        "key": "messages-courts",
        "label": "Messages courts"
      }
    ]
  }
];

const PAR_CLE = new Map(QUESTIONS.map((q) => [q.key, q]));

export function questionByKey(key: string): Question | undefined {
  return PAR_CLE.get(key);
}

/** Questions proposées à la saisie (hors retirées), d'un thème ou de tous. */
export function proposedQuestions(theme?: string): Question[] {
  return QUESTIONS.filter((q) => !q.retired && (theme === undefined || q.theme === theme));
}

