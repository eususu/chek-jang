// Zod 스키마 (챕터)
import { z } from 'zod';

export const createChapterSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  orderNum: z.number().int().positive(),
});

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  orderNum: z.number().int().positive().optional(),
});

export const reorderChaptersSchema = z.object({
  chapterIds: z.array(z.number().int().positive()),
});
