/**
 * Règles éditoriales du journal « Où en est Libre » (spec 007, § Règles
 * éditoriales ; research R3).
 *
 * Le dépôt de Libre est public : une nouvelle qui dirait *ce qui* a changé,
 * *quand* et *comment* le repérer ferait de chaque publication un mode
 * d'emploi pour qui cherche à contourner. D'où une seule règle d'or — on dit
 * ce que le membre y gagne, jamais comment ça marche — déclinée en sept règles.
 *
 * **Une seule source** : l'écran de rédaction affiche ces textes et le
 * contrôle (`garde-fous.ts`) applique ces motifs. Modifier l'un sans l'autre
 * est impossible, sur le patron de `REGLES_RETENTION` (#427).
 *
 * Les motifs **assistent** la relecture, ils ne la remplacent pas (FR-020) :
 * ils préfèrent un faux positif, que l'admin lève d'un geste, à un oubli.
 */

export interface Motif {
  id: string;
  /** Ce que l'alerte dit à l'admin. */
  description: string;
  /** Bloquant : aucune levée possible (FR-016). Sinon, levable extrait par extrait. */
  bloquant: boolean;
  /** Extraits du texte qui déclenchent le motif, dans l'ordre d'apparition. */
  trouver: (texte: string) => string[];
}

export interface RegleEditoriale {
  id: string;
  enonce: string;
  aEviter: string;
  plutot: string;
  motifs: Motif[];
}

/** Toutes les correspondances d'une expression (drapeau `g` imposé). */
function tout(re: RegExp): (texte: string) => string[] {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  return (texte) => Array.from(texte.matchAll(g), (m) => (m[1] ?? m[0]).trim()).filter(Boolean);
}

/** Domaine du site : les liens vers Libre lui-même sont sur liste blanche. */
export const DOMAINE_SITE = 'getlibre.fr';

const COURRIEL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export const REGLES_EDITORIALES: readonly RegleEditoriale[] = [
  {
    id: 'r1',
    enonce: 'Rien sur la détection ni la modération : ni règles, ni seuils, ni mots-clés, ni signaux, ni délais, ni outils.',
    aEviter: 'Un profil avec un @ sur sa photo part désormais en vérification.',
    plutot: 'On a renforcé la lutte contre les faux profils.',
    motifs: [
      {
        id: 'vocabulaire-detection',
        description: 'Vocabulaire de détection ou de modération',
        bloquant: false,
        trouver: tout(/\b(seuils?|signal|signaux|scores?|détect\w*|detect\w*|regex|expressions? régulières?|mots?[- ]clés?|faux positifs?|algorithmes?|heuristiques?|listes? noires?|empreintes?|OCR|reconnaissance de texte|recherche inversée|(?:part|partent|passe|passent|placée?s?|envoyée?s?)\s+(?:\S+\s+)?en\s+vérification|mise?s?\s+en\s+retrait|déclench\w*)\b/iu),
      },
    ],
  },
  {
    id: 'r2',
    enonce: 'Rien de non corrigé, rien avant déploiement. Une faiblesse ne s’évoque qu’une fois corrigée et en ligne, sans dire comment elle s’exploitait.',
    aEviter: 'Les photos gardaient la position GPS ; c’est corrigé demain.',
    plutot: 'Vos photos sont désormais nettoyées de leurs informations cachées.',
    motifs: [
      {
        id: 'faiblesse',
        description: 'Mention d’une faille, d’un contournement ou d’un correctif à venir',
        bloquant: false,
        trouver: tout(/\b(failles?|vulnérabilités?|exploit\w*|contourn\w*|brèches?|fuites?|pas encore corrigée?s?|sera corrigée?s?|bientôt corrigée?s?|en cours de correction|corrigée?s?\s+(?:demain|bientôt|prochainement|sous peu|la semaine prochaine|dans\s+\S+\s+jours?))\b/iu),
      },
    ],
  },
  {
    id: 'r3',
    enonce: 'Aucun nom technique : ni route, ni fichier, ni dépendance, ni version.',
    aEviter: 'La route /api/users/photos passe désormais par sharp 0.35.',
    plutot: 'L’envoi de photos a été revu.',
    motifs: [
      {
        id: 'chemin-technique',
        description: 'Chemin technique',
        bloquant: false,
        trouver: tout(/(?:^|[\s(])(\/(?:api|admin|src|prisma|_next)\b[^\s)]*)/iu),
      },
      {
        id: 'nom-de-fichier',
        description: 'Nom de fichier de code',
        bloquant: false,
        trouver: tout(/\b[\w.-]+\.(?:tsx?|jsx?|mjs|json|sql|prisma|py|env|ya?ml|toml|sh)\b/iu),
      },
      {
        id: 'version',
        description: 'Numéro de version',
        bloquant: false,
        trouver: tout(/\bv?\d+\.\d+(?:\.\d+)*\b/iu),
      },
      {
        id: 'dependance',
        description: 'Nom d’outil ou de dépendance',
        bloquant: false,
        trouver: tout(/\b(next\.?js|prisma|postgres\w*|postgis|vercel|neon|cloudflare|pusher|nextauth|sharp|tesseract\w*|upstash|node\.?js|npm)\b/iu),
      },
    ],
  },
  {
    id: 'r4',
    enonce: 'Aucun chiffre de modération : ni bannis, ni signalements, ni comptes supprimés, même arrondis.',
    aEviter: 'Ce mois-ci, 12 comptes ont été bannis.',
    plutot: 'Notre équipe veille, et chaque signalement est lu.',
    motifs: [
      {
        id: 'chiffre-moderation',
        description: 'Chiffre associé à des bannissements, signalements ou suppressions',
        bloquant: false,
        trouver: tout(/(\d[\d\s ]*[^.\n\d]{0,40}?\b(?:bann\w*|signalement\w*|signalé\w*|suspendu\w*|supprim\w*|exclu\w*)|\b(?:bann\w*|signalement\w*|suspendu\w*|supprim\w*|exclu\w*)[^.\n\d]{0,40}\d+)/iu),
      },
    ],
  },
  {
    id: 'r5',
    enonce: 'Personne d’identifiable : ni pseudo, ni @identifiant, ni e-mail, ni téléphone, ni ville, ni date précise d’un incident, ni récit qui permette de reconnaître un cas. Pas de lien vers un autre site sans raison.',
    aEviter: 'Le 24 septembre, @lola_privee75 a été démasquée.',
    plutot: 'Des faux profils circulent sur toutes les apps ; voici comment les reconnaître.',
    motifs: [
      {
        id: 'courriel',
        description: 'Adresse e-mail — jamais publiable',
        bloquant: true,
        trouver: tout(COURRIEL),
      },
      {
        id: 'telephone',
        description: 'Numéro de téléphone — jamais publiable',
        bloquant: true,
        trouver: tout(/((?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b|\+\d{1,3}(?:[\s.-]?\d){8,13}\b)/u),
      },
      {
        id: 'identifiant',
        description: 'Identifiant de type @pseudo',
        bloquant: false,
        // Un @ précédé d'un caractère de mot est un e-mail (motif bloquant ci-dessus).
        trouver: tout(/(?:^|[^\w.@])(@[A-Za-z0-9_.]{2,})/u),
      },
      {
        id: 'lien-externe',
        description: 'Lien vers un autre site',
        bloquant: false,
        trouver: (texte) =>
          tout(/(https?:\/\/[^\s)\]]+)/iu)(texte).filter((url) => {
            try {
              const hote = new URL(url).hostname;
              return hote !== DOMAINE_SITE && !hote.endsWith('.' + DOMAINE_SITE);
            } catch {
              return true;
            }
          }),
      },
    ],
  },
  {
    id: 'r6',
    enonce: 'Les conseils anti-arnaque se placent côté victime : ce que l’arnaqueur demande (quitter l’app, payer en coupons prépayés, envoyer de l’argent, cliquer un lien), jamais ce que Libre repère ou bloque.',
    aEviter: 'Nous bloquons automatiquement les messages qui parlent de coupons.',
    plutot: 'Personne de sincère ne te demandera de payer en coupons prépayés.',
    motifs: [
      {
        id: 'cote-detection',
        description: 'Formulation côté détection (ce que Libre repère ou bloque)',
        bloquant: false,
        trouver: tout(/\b((?:nous|on)\s+(?:repér\w*|repère\w*|bloqu\w*|détect\w*|filtr\w*|surveill\w*)|automatiquement|est bloqué\w*|sont bloqué\w*)\b/iu),
      },
    ],
  },
  {
    id: 'r7',
    enonce: 'Les chiffres de la communauté s’arrondissent : « plus de 100 inscrits », pas « 103 inscrits ».',
    aEviter: 'Nous sommes 103 inscrits !',
    plutot: 'Nous sommes plus de 100 !',
    motifs: [
      {
        id: 'chiffre-exact',
        description: 'Chiffre communautaire exact — l’arrondir',
        bloquant: false,
        trouver: (texte) =>
          tout(/(\b\d[\d\s ]*\s*(?:inscrit\w*|membres?|profils?|comptes?|personnes?|utilisat\w*))/iu)(texte).filter((extrait) => {
            const n = Number(extrait.replace(/[^\d]/g, ''));
            return n >= 10 && n % 10 !== 0;
          }),
      },
    ],
  },
];
