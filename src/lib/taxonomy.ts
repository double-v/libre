export interface TagCategory {
  name: string;
  items: string[];
}

// ─── Centres d'intérêt ────────────────────────────────────────────────────────

export const INTEREST_CATEGORIES: TagCategory[] = [
  {
    name: 'Arts & Culture',
    items: ['Cinema', 'Litterature', 'Musique', 'Photographie', 'Theatre', 'Peinture', 'Podcasts'],
  },
  {
    name: 'Sport & Nature',
    items: ['Randonnee', 'Running', 'Yoga', 'Natation', 'Escalade', 'Velo', 'Surf'],
  },
  {
    name: 'Sorties & Vie sociale',
    items: ['Apero', 'Concerts', 'Festivals', 'Restaurants', 'Bars', 'Soirees jeux', 'Brocantes'],
  },
  {
    name: 'Technologie',
    items: ['Gaming', 'Programmation', 'DIY', 'Sci-fi', 'Crypto', 'Impression 3D'],
  },
  {
    name: 'Bien-etre',
    items: ['Meditation', 'Cuisine', 'Jardinage', 'Voyages', 'Ecologie', 'Benevolat', 'Spiritualite'],
  },
];

// ─── Pratiques & Preferences ─────────────────────────────────────────────────
// Langage courtois et inclusif — rien d'explicite.
// Libre n'est pas une app kink, mais reconnait que ces preferences existent.

export const PRACTICE_CATEGORIES: TagCategory[] = [
  {
    name: 'Sensualite & Intimite',
    items: ['Massage sensuel', 'Tantra', 'Slow sex', 'Eye contact', 'Bain a deux', 'Candaulisme'],
  },
  {
    name: 'Jeux & Role-play',
    items: ['Dom/soumission', 'Dirty talk', 'Jeux de role', 'Degradation', 'Orgasm control', 'Pet play'],
  },
  {
    name: 'Accessoires & Matiere',
    items: ['Ligotage', 'Menottes', 'Fessée', 'Cire chaude', 'Plumes', 'Vibro'],
  },
  {
    name: 'Exploration & Fantasmes',
    items: ['Exhibition', 'Voyeurisme', 'Triolisme', 'Echangisme', 'Cuckold', 'Bukkake', 'Urophilie'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAllInterestTags(): string[] {
  return INTEREST_CATEGORIES.flatMap((c) => c.items);
}

export function getAllPracticeTags(): string[] {
  return PRACTICE_CATEGORIES.flatMap((c) => c.items);
}

export function findCategoryForTag(tag: string, categories: TagCategory[]): string | undefined {
  return categories.find((c) => c.items.includes(tag))?.name;
}