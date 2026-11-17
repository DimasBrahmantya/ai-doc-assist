import { z } from 'zod';
import { uuidSchema } from './common';

export const messageSourceSchema = z.object({
  chunkId: uuidSchema,
  page: z.number().int().positive(),
  snippet: z.string().max(1000),
  similarity: z.number().min(0).max(1).optional(),
});

export const createMessageSchema = z.object({
  conversationId: uuidSchema,
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1, 'Message content cannot be empty').max(20000),
  sources: z.array(messageSourceSchema).optional(),
});

export const chatRequestSchema = z.object({
  conversationId: uuidSchema,
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message cannot exceed 4000 characters'),
});
