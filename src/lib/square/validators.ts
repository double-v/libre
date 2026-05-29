import { z } from 'zod';

export const squareMessageSchema = z.object({
  content: z.string().min(1).max(500),
  type: z.enum(['text', 'emoji', 'reaction', 'gif', 'polite', 'riddle']).default('text'),
});