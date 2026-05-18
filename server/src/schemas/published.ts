import { z } from 'zod';

export const PublishWorkflowSchema = z.object({
  workflowId: z.string().min(1),
  publishedBy: z.string().optional(),
  // Complete PublishedWorkflow JSON string to store (replaces raw draft content)
  content: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
});

// Schema for importing and publishing a workflow directly
export const ImportPublishWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  content: z.string().min(1).max(1024 * 1024), // Max 1MB for complete PublishedWorkflow JSON
  category: z.string().optional(),
  version: z.string().optional(),
  publishedBy: z.string().optional(),
});

export const PublishedWorkflowParamsSchema = z.object({
  id: z.string().min(1),
});

export const PublishedWorkflowQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const PatchPublishedWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export type PublishWorkflowInput = z.infer<typeof PublishWorkflowSchema>;
export type ImportPublishWorkflowInput = z.infer<typeof ImportPublishWorkflowSchema>;
export type PublishedWorkflowParams = z.infer<typeof PublishedWorkflowParamsSchema>;
export type PublishedWorkflowQuery = z.infer<typeof PublishedWorkflowQuerySchema>;
