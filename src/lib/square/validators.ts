import { z } from 'zod';

// GIPHY's media URLs are served from media0/1/2/3.giphy.com.
// We restrict the gifUrl to those hostnames to prevent SSRF / hotlinking
// of attacker-controlled images.
const giphyUrl = z
  .string()
  .url()
  .max(500)
  .refine(
    (u) => {
      try {
        const host = new URL(u).hostname;
        // GIPHY serves from media0-3.giphy.com (subdomain varies for load balancing).
        return /^media[0-9]?\.giphy\.com$/.test(host);
      } catch {
        return false;
      }
    },
    { message: 'gifUrl must be a GIPHY media URL' },
  );

export const squareMessageSchema = z
  .object({
    content: z.string().min(1).max(500),
    type: z.enum(['text', 'emoji', 'reaction', 'gif', 'polite', 'riddle']).default('text'),
    gifUrl: giphyUrl.optional(),
  })
  .refine(
    (data) => {
      // If the message is a GIF, the URL is required and content can be empty.
      if (data.type === 'gif') return !!data.gifUrl;
      // Otherwise no gifUrl allowed.
      return !data.gifUrl;
    },
    { message: 'gifUrl required when type=gif, forbidden otherwise', path: ['gifUrl'] },
  );

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