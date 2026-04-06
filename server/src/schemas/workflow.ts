import { z } from 'zod';

export const WorkflowStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  content: z.string().min(1).max(1024 * 1024), // Max 1MB
  category: z.string().optional(),
  version: z.string().default('1.0.0'),
});

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  content: z.string().max(1024 * 1024).optional(), // Max 1MB
  category: z.string().optional(),
  version: z.string().optional(),
});

export const UpdateWorkflowMetaSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: WorkflowStatusSchema.optional(),
  category: z.string().optional(),
});

export const WorkflowParamsSchema = z.object({
  id: z.string().min(1),
});

export const WorkflowQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export const ImportWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  content: z.string(),
  category: z.string().optional(),
  version: z.string().optional(),
  overwrite: z.boolean().default(false),
});

// Version creation schema - server-side version generation
export const CreateVersionSchema = z.object({
  content: z.string().min(1).max(1024 * 1024),
  baseRevision: z.string().optional(), // For conflict detection
});

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;
export type UpdateWorkflowMetaInput = z.infer<typeof UpdateWorkflowMetaSchema>;
export type WorkflowParams = z.infer<typeof WorkflowParamsSchema>;
export type WorkflowQuery = z.infer<typeof WorkflowQuerySchema>;
export type ImportWorkflowInput = z.infer<typeof ImportWorkflowSchema>;
