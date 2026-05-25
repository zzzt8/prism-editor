import { z } from 'zod';

export const SKURenderParamsSchema = z.object({
  id: z.string().min(1),
});

export const SKURenderBodySchema = z.object({
  userParams: z.record(z.unknown()).default({}),
  workflowIds: z.array(z.string()).optional(),
});

export type SKURenderParams = z.infer<typeof SKURenderParamsSchema>;
export type SKURenderBody = z.infer<typeof SKURenderBodySchema>;
