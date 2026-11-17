import { z } from 'zod';
import { uuidSchema } from './common';

export const documentIdParamSchema = z.object({
  id: uuidSchema,
});
