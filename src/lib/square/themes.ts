export interface SquareTheme {
  id: string;
  label: string;
  description: string;
  inputType: 'text' | 'emoji' | 'reactions' | 'gif' | 'polite' | 'riddle';
  placeholder: string;
  maxLength: number;
  allowFreeText: boolean;
  /** Predefined options if inputType limits choices */
  options?: string[];
  /** Pseudonym generator for this theme */
  getPseudonym: (userId: string, daySeed: number) => string;
}

const FRENCH_OLD_NAMES = [
  'Archibald', 'Gédéon', 'Gertrude', 'Clothilde', 'Honoré', 'Eustache',
  'Berthe', 'Léocadie', 'Théodule', 'Philibert', 'Gaston', 'Adélaïde',
  'Barnabé', 'Cunégonde', 'Fiacre', 'Sidoine', 'Aurélie', 'Baudouin',
  'Olympe', 'Prospère', 'Vulfran', 'Zéphyrine', 'Hilaire', 'Mélusine',
  'Aubin', 'Dorothée', 'Clotaire', 'Sévérine', 'Barthélemy', 'Joséphine',
];

const REACTIONS = ['❤️', '😊', '🔥', '👋', '😂', '✨', '💯', '🤝'];

const POLITE_PHRASES = [
  'Bonjour !', 'Enchanté(e) !', 'Merci beaucoup !', 'Bonne journée !',
  'Au revoir !', 'Bienvenue !', 'Avec plaisir !', 'À bientôt !',
  'Comment allez-vous ?', 'Ravi(e) de vous rencontrer !', 'Bonne soirée !',
  'Tout le bien possible !', 'Chaleureusement !', 'Respectueusement !',
];

const CURATED_GIFS: string[] = []; // Placeholder — real GIF URLs to be added later

export const SQUARE_THEMES: SquareTheme[] = [
  {
    id: 'pseudonyms',
    label: 'Pseudonymes d\'autrefois',
    description: 'Vieux prénoms français, conversation libre.',
    inputType: 'text',
    placeholder: 'Écris un message…',
    maxLength: 200,
    allowFreeText: true,
    getPseudonym: (userId: string, daySeed: number) => {
      const index = Math.abs(hashCode(userId + daySeed)) % FRENCH_OLD_NAMES.length;
      return FRENCH_OLD_NAMES[index];
    },
  },
  {
    id: 'emojis',
    label: 'Mode Émoji',
    description: 'Uniquement des émojis, pas de texte.',
    inputType: 'emoji',
    placeholder: 'Choisis un émoji…',
    maxLength: 10,
    allowFreeText: false,
    options: ['😀', '❤️', '🔥', '👀', '💯', '🎉', '😍', '🤔', '💪', '👋', '😂', '✨', '🥂', '🌈', '☕', '🌟'],
    getPseudonym: (userId: string, daySeed: number) => {
      const emojis = ['🦊', '🐱', '🐻', '🦉', '🐸', '🦋', '🐙', '🦄', '🐝', '🦈'];
      const index = Math.abs(hashCode(userId + daySeed)) % emojis.length;
      return emojis[index];
    },
  },
  {
    id: 'polite',
    label: 'Formules de politesse',
    description: 'Choix limité de phrases polies.',
    inputType: 'polite',
    placeholder: 'Choisis une formule…',
    maxLength: 50,
    allowFreeText: false,
    options: POLITE_PHRASES,
    getPseudonym: (userId: string, daySeed: number) => {
      const titles = ['Monsieur', 'Madame', 'Docteur', 'Professeur', 'Maître'];
      const index = Math.abs(hashCode(userId + daySeed)) % titles.length;
      return titles[index];
    },
  },
  {
    id: 'gifs',
    label: 'Mode GIF',
    description: 'Uniquement des GIFs, pas de texte.',
    inputType: 'gif',
    placeholder: 'Choisis un GIF…',
    maxLength: 500,
    allowFreeText: false,
    options: CURATED_GIFS,
    getPseudonym: (userId: string, daySeed: number) => {
      const names = ['GIFfan', 'Animateur', 'Bougeur', 'Réactif', 'Mouvant'];
      const index = Math.abs(hashCode(userId + daySeed)) % names.length;
      return names[index];
    },
  },
  {
    id: 'freepseudonyms',
    label: 'Pseudonymes + texte libre',
    description: 'Pseudos aléatoires, écriture normale.',
    inputType: 'text',
    placeholder: 'Écris un message…',
    maxLength: 500,
    allowFreeText: true,
    getPseudonym: (userId: string, daySeed: number) => {
      const index = Math.abs(hashCode(userId + daySeed)) % FRENCH_OLD_NAMES.length;
      return FRENCH_OLD_NAMES[index];
    },
  },
  {
    id: 'riddle',
    label: 'Charades & Devinettes',
    description: 'Uniquement des devinettes ou des réponses.',
    inputType: 'riddle',
    placeholder: 'Pose une devinette ou réponds…',
    maxLength: 300,
    allowFreeText: true,
    getPseudonym: (userId: string, daySeed: number) => {
      const names = ['Énigmatique', 'Mystérieux', 'Curieux', 'Perplex', 'Astucieux'];
      const index = Math.abs(hashCode(userId + daySeed)) % names.length;
      return names[index];
    },
  },
  {
    id: 'reactions',
    label: 'Silence Doré',
    description: 'Seulement des réactions, pas de texte.',
    inputType: 'reactions',
    placeholder: 'Choisis une réaction…',
    maxLength: 2,
    allowFreeText: false,
    options: REACTIONS,
    getPseudonym: (userId: string, daySeed: number) => {
      const names = ['Silent', 'Observateur', 'Méditatif', 'Serein', 'Calme'];
      const index = Math.abs(hashCode(userId + daySeed)) % names.length;
      return names[index];
    },
  },
];

/** Get today's theme based on the day of week */
export function getTodayTheme(): SquareTheme {
  const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon, ...
  // Map: Sun=reactions, Mon=pseudonyms, Tue=emojis, Wed=polite, Thu=gifs, Fri=freepseudonyms, Sat=riddle
  const themeMap = [6, 0, 1, 2, 3, 4, 5]; // dayIndex -> SQUARE_THEMES index
  return SQUARE_THEMES[themeMap[dayIndex]];
}

/** Get a pseudonym for a user on a given day */
export function getPseudonym(userId: string): string {
  const today = new Date();
  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const theme = getTodayTheme();
  return theme.getPseudonym(userId, daySeed);
}

/** Simple hash function for deterministic pseudonym generation */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}