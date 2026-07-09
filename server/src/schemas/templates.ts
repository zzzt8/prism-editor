// Zod input validation schemas for ProductTemplate CRUD API
// Phase 2: ProductTemplate multi-flow support

import { z } from 'zod';
import type { Workflow, Asset } from '@prisma/client';

// Platform enum
export const PlatformSchema = z.enum(['browser', 'nodejs']);
export type Platform = z.infer<typeof PlatformSchema>;

// --- ProductTemplate schemas ---

export const CreateProductTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  content: z.string(), // Full ProductTemplate JSON string
});

export const UpdateProductTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  content: z.string().optional(),
});

export type CreateProductTemplateInput = z.infer<typeof CreateProductTemplateSchema>;
export type UpdateProductTemplateInput = z.infer<typeof UpdateProductTemplateSchema>;

// --- Flow (Workflow) schemas ---

export const CreateFlowSchema = z.object({
  name: z.string().min(1).max(255),
  platform: PlatformSchema,
  content: z.string(), // Workflow JSON string
});

export const UpdateFlowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  platform: PlatformSchema.optional(),
  content: z.string().optional(),
});

export type CreateFlowInput = z.infer<typeof CreateFlowSchema>;
export type UpdateFlowInput = z.infer<typeof UpdateFlowSchema>;
