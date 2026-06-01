import { z } from 'zod';

export const squareMessageSchema = z.object({
  content: z.string().min(1).max(500),
  type: z.enum(['text', 'emoji', 'reaction', 'gif', 'polite', 'riddle']).default('text'),
});

export const bannedWordCreateSchema = z.object({
  word: z.string().min(1).max(100),
  severity: z.enum(['block', 'censor']).default('block'),
});

export const bannedWordBulkSchema = z.object({
  words: z.array(z.object({
    word: z.string().min(1).max(100),
    severity: z.enum(['block', 'censor']).default('block'),
  })).min(1).max(500),
  clearExisting: z.boolean().default(false),
});

export const squareReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const squareReportSchema = z.object({
  reason: z.enum(['inappropriate', 'harassment', 'spam', 'other']),
});