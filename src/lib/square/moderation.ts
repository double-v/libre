import { getDb } from '@/lib/db';

interface BannedWordEntry {
  word: string;
  severity: 'block' | 'censor';
}

let cachedWords: BannedWordEntry[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getBannedWords(): Promise<BannedWordEntry[]> {
  const now = Date.now();
  if (cachedWords && now < cacheExpiry) {
    return cachedWords;
  }

  const rows = await getDb().bannedWord.findMany({
    select: { word: true, severity: true },
    orderBy: { word: 'asc' },
  });

  cachedWords = rows.map((r) => ({
    word: r.word.toLowerCase(),
    severity: r.severity as 'block' | 'censor',
  }));
  cacheExpiry = now + CACHE_TTL_MS;
  return cachedWords;
}

export function invalidateBannedWordsCache(): void {
  cachedWords = null;
  cacheExpiry = 0;
}

export interface ModerationResult {
  allowed: boolean;
  censored: string;
  blockedWord?: string;
}

export async function checkContent(content: string): Promise<ModerationResult> {
  const words = await getBannedWords();
  const lowerContent = content.toLowerCase();

  // Check for blocking words first
  for (const entry of words) {
    if (entry.severity === 'block' && lowerContent.includes(entry.word)) {
      return { allowed: false, censored: content, blockedWord: entry.word };
    }
  }

  // Apply censoring
  let censored = content;
  for (const entry of words) {
    if (entry.severity === 'censor') {
      const regex = new RegExp(escapeRegex(entry.word), 'gi');
      censored = censored.replace(regex, '***');
    }
  }

  return { allowed: true, censored };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}