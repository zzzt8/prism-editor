import { z } from 'zod';

export const CreateProductTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  content: z.string().min(1).max(10 * 1024 * 1024), // Max 10MB
});

export const UpdateProductTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  content: z.string().max(10 * 1024 * 1024).optional(),
});

export const ProductTemplateParamsSchema = z.object({
  id: z.string().min(1),
});

export const ProductTemplateQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export const PublishProductTemplateSchema = z.object({
  workflowId: z.string().min(1),
});

export type CreateProductTemplateInput = z.infer<typeof CreateProductTemplateSchema>;
export type UpdateProductTemplateInput = z.infer<typeof UpdateProductTemplateSchema>;
export type ProductTemplateParams = z.infer<typeof ProductTemplateParamsSchema>;
export type ProductTemplateQuery = z.infer<typeof ProductTemplateQuerySchema>;
export type PublishProductTemplateInput = z.infer<typeof PublishProductTemplateSchema>;
