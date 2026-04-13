import { z } from 'zod';

export const createIllustrationSchema = z.object({
  imageUrl: z.string().url().max(2000),
  caption: z.string().max(500).optional(),
});

export const updateIllustrationSchema = z.object({
  imageUrl: z.string().url().max(2000).optional(),
  caption: z.string().max(500).optional(),
});
