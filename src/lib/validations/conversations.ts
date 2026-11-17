import { z } from 'zod';
import { uuidSchema } from './common';

export const conversationIdParamSchema = z.object({
  id: uuidSchema,
});

export const createConversationSchema = z.object({
  documentId: uuidSchema,
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
});

export const updateConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
});
