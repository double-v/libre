import dotenv from "dotenv";
dotenv.config();            // .env (contains DATABASE_URL)
dotenv.config({ path: ".env.local", override: true }); // .env.local overrides

import { getDb } from "../src/lib/db";
import { Prisma } from "../src/generated/client/client";

const themes = [
  {
    themeId: "pseudonyms",
    label: "Pseudonymes d'autrefois",
    description: "Vieux prénoms français, conversation libre.",
    inputType: "text",
    placeholder: "Écris un message…",
    maxLength: 200,
    allowFreeText: true,
    options: null,
    pseudonymNames: [
      "Archibald", "Gédéon", "Gertrude", "Clothilde", "Honoré",
      "Eustache", "Berthe", "Léocadie", "Théodule", "Philibert",
      "Gaston", "Adélaïde", "Barnabé", "Cunégonde", "Fiacre",
      "Sidoine", "Aurélie", "Baudouin", "Olympe", "Prospère",
      "Vulfran", "Zéphyrine", "Hilaire", "Mélusine", "Aubin",
      "Dorothée", "Clotaire", "Sévérine", "Barthélemy", "Joséphine",
    ],
  },
  {
    themeId: "emojis",
    label: "Mode Émoji",
    description: "Uniquement des émojis, pas de texte.",
    inputType: "emoji",
    placeholder: "Choisis un émoji…",
    maxLength: 10,
    allowFreeText: false,
    options: ["😀", "❤️", "🔥", "👀", "💯", "🎉", "😍", "🤔", "💪", "👋", "😂", "✨", "🥂", "🌈", "☕", "🌟"],
    pseudonymNames: ["🦊", "🐱", "🐻", "🦉", "🐸", "🦋", "🐙", "🦄", "🐝", "🦈"],
  },
  {
    themeId: "polite",
    label: "Formules de politesse",
    description: "Choix limité de phrases polies.",
    inputType: "polite",
    placeholder: "Choisis une formule…",
    maxLength: 50,
    allowFreeText: false,
    options: [
      "Bonjour !", "Enchanté(e) !", "Merci beaucoup !", "Bonne journée !",
      "Au revoir !", "Bienvenue !", "Avec plaisir !", "À bientôt !",
      "Comment allez-vous ?", "Ravi(e) de vous rencontrer !",
      "Bonne soirée !", "Tout le bien possible !", "Chaleureusement !",
      "Respectueusement !",
    ],
    pseudonymNames: ["Monsieur", "Madame", "Docteur", "Professeur", "Maître"],
  },
  {
    themeId: "gifs",
    label: "Mode GIF",
    description: "Uniquement des GIFs, pas de texte.",
    inputType: "gif",
    placeholder: "Choisis un GIF…",
    maxLength: 500,
    allowFreeText: false,
    options: [],
    pseudonymNames: ["GIFfan", "Animateur", "Bougeur", "Réactif", "Mouvant"],
  },
  {
    themeId: "freepseudonyms",
    label: "Pseudonymes + texte libre",
    description: "Pseudos aléatoires, écriture normale.",
    inputType: "text",
    placeholder: "Écris un message…",
    maxLength: 500,
    allowFreeText: true,
    options: null,
    pseudonymNames: [
      "Archibald", "Gédéon", "Gertrude", "Clothilde", "Honoré",
      "Eustache", "Berthe", "Léocadie", "Théodule", "Philibert",
      "Gaston", "Adélaïde", "Barnabé", "Cunégonde", "Fiacre",
      "Sidoine", "Aurélie", "Baudouin", "Olympe", "Prospère",
      "Vulfran", "Zéphyrine", "Hilaire", "Mélusine", "Aubin",
      "Dorothée", "Clotaire", "Sévérine", "Barthélemy", "Joséphine",
    ],
  },
  {
    themeId: "riddle",
    label: "Charades & Devinettes",
    description: "Uniquement des devinettes ou des réponses.",
    inputType: "riddle",
    placeholder: "Pose une devinette ou réponds…",
    maxLength: 300,
    allowFreeText: true,
    options: null,
    pseudonymNames: ["Énigmatique", "Mystérieux", "Curieux", "Perplex", "Astucieux"],
  },
  {
    themeId: "reactions",
    label: "Silence Doré",
    description: "Seulement des réactions, pas de texte.",
    inputType: "reactions",
    placeholder: "Choisis une réaction…",
    maxLength: 2,
    allowFreeText: false,
    options: ["❤️", "😊", "🔥", "👋", "😂", "✨", "💯", "🤝"],
    pseudonymNames: ["Silent", "Observateur", "Méditatif", "Serein", "Calme"],
  },
];

const defaultSchedule: Record<number, string> = {
  0: "reactions",    // Sunday
  1: "pseudonyms",   // Monday
  2: "emojis",       // Tuesday
  3: "polite",       // Wednesday
  4: "gifs",         // Thursday
  5: "freepseudonyms", // Friday
  6: "riddle",       // Saturday
};

/** Convert null to Prisma.JsonNull for nullable JSON fields */
function toJson<T>(value: T[] | null): Prisma.NullableJsonNullValueInput | T[] {
  return value === null ? Prisma.JsonNull : value;
}

async function main() {
  const db = getDb();

  console.log("Seeding SquareThemeConfig entries...");

  // Upsert all theme configs
  for (const theme of themes) {
    const record = await db.squareThemeConfig.upsert({
      where: { themeId: theme.themeId },
      update: {
        label: theme.label,
        description: theme.description,
        inputType: theme.inputType,
        placeholder: theme.placeholder,
        maxLength: theme.maxLength,
        allowFreeText: theme.allowFreeText,
        options: toJson(theme.options),
        pseudonymNames: toJson(theme.pseudonymNames),
      },
      create: {
        themeId: theme.themeId,
        label: theme.label,
        description: theme.description,
        inputType: theme.inputType,
        placeholder: theme.placeholder,
        maxLength: theme.maxLength,
        allowFreeText: theme.allowFreeText,
        options: toJson(theme.options),
        pseudonymNames: toJson(theme.pseudonymNames),
      },
    });
    console.log(`  Upserted theme: ${theme.themeId} (${record.id})`);
  }

  console.log("Seeding SquareThemeSchedule entries...");

  // Fetch all theme configs to resolve themeConfigId from themeId
  const allConfigs = await db.squareThemeConfig.findMany();
  const configByThemeId = new Map(allConfigs.map((c) => [c.themeId, c.id]));

  // Upsert schedule slots
  for (const [dayOfWeek, themeId] of Object.entries(defaultSchedule)) {
    const configId = configByThemeId.get(themeId);
    if (!configId) {
      console.error(`  ERROR: themeId "${themeId}" not found in DB, skipping day ${dayOfWeek}`);
      continue;
    }

    const slot = await db.squareThemeSchedule.upsert({
      where: { dayOfWeek: Number(dayOfWeek) },
      update: { themeConfigId: configId },
      create: {
        dayOfWeek: Number(dayOfWeek),
        themeConfigId: configId,
      },
    });
    console.log(`  Upserted schedule: day ${dayOfWeek} → ${themeId} (${slot.id})`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });