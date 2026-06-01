import { getDb } from '@/lib/db';
import type { SquareTheme } from './themes';

export interface ThemeConfigRow {
  id: string;
  themeId: string;
  label: string;
  description: string;
  inputType: string;
  placeholder: string;
  maxLength: number;
  allowFreeText: boolean;
  options: string[] | null;
  pseudonymNames: string[] | null;
}

let cachedTheme: { config: ThemeConfigRow; daySeed: number } | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

/** Get today's theme config from DB (with fallback to hardcoded) */
export async function getTodayThemeConfig(): Promise<ThemeConfigRow> {
  const now = new Date();
  const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

  // Check cache — only valid for same day and within TTL
  if (cachedTheme && cachedTheme.daySeed === daySeed && Date.now() < cacheExpiry) {
    return cachedTheme.config;
  }

  const dayOfWeek = now.getDay();
  const scheduleSlot = await getDb().squareThemeSchedule.findUnique({
    where: { dayOfWeek },
    include: { themeConfig: true },
  });

  if (scheduleSlot?.themeConfig) {
    const tc = scheduleSlot.themeConfig;
    const config: ThemeConfigRow = {
      id: tc.id,
      themeId: tc.themeId,
      label: tc.label,
      description: tc.description,
      inputType: tc.inputType,
      placeholder: tc.placeholder,
      maxLength: tc.maxLength,
      allowFreeText: tc.allowFreeText,
      options: tc.options as string[] | null,
      pseudonymNames: tc.pseudonymNames as string[] | null,
    };
    cachedTheme = { config, daySeed };
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return config;
  }

  // Fallback to hardcoded themes
  const { getTodayTheme } = require('./themes') as { getTodayTheme: () => SquareTheme };
  const fallback = getTodayTheme();
  const config: ThemeConfigRow = {
    id: 'fallback',
    themeId: fallback.id,
    label: fallback.label,
    description: fallback.description,
    inputType: fallback.inputType,
    placeholder: fallback.placeholder,
    maxLength: fallback.maxLength,
    allowFreeText: fallback.allowFreeText,
    options: fallback.options ?? null,
    pseudonymNames: null, // fallback themes don't expose this
  };
  cachedTheme = { config, daySeed };
  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return config;
}

/** Get a pseudonym for a user based on DB theme config */
export async function getPseudonymFromConfig(userId: string): Promise<string> {
  const config = await getTodayThemeConfig();
  const now = new Date();
  const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

  const names = (config.pseudonymNames as string[] | null) ?? [];
  if (names.length > 0) {
    const index = Math.abs(hashCode(userId + daySeed)) % names.length;
    return names[index];
  }

  // Fallback pseudonym generation
  const fallbackNames = ['Anonyme', 'Mystère', 'Passant', 'Visiteur', 'Inconnu'];
  const index = Math.abs(hashCode(userId + daySeed)) % fallbackNames.length;
  return fallbackNames[index];
}