import { z } from 'zod';

// SKU Input Field Schemas
export const SKUImageConstraintsSchema = z.object({
  accept: z.array(z.string()).optional(),
  maxSizeMB: z.number().positive().optional(),
  aspectRatio: z.string().optional(),
  minWidth: z.number().int().positive().optional(),
  minHeight: z.number().int().positive().optional(),
  multiple: z.boolean().optional(),
});

export const SKUInputFieldBaseSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional(),
  description: z.string().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
});

export const SKUTextFieldSchema = SKUInputFieldBaseSchema.extend({
  type: z.literal('string'),
  defaultValue: z.string().optional(),
  placeholder: z.string().optional(),
  isAssetId: z.boolean().optional(),
});

export const SKUNumberFieldSchema = SKUInputFieldBaseSchema.extend({
  type: z.literal('number'),
  defaultValue: z.number().optional(),
  step: z.number().positive().optional(),
});

export const SKUSelectFieldSchema = SKUInputFieldBaseSchema.extend({
  type: z.literal('select'),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })),
  multiple: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.array(z.string())]).optional(),
});

export const SKUColorFieldSchema = SKUInputFieldBaseSchema.extend({
  type: z.literal('color'),
  defaultValue: z.string().optional(), // hex color
});

export const SKUBooleanFieldSchema = SKUInputFieldBaseSchema.extend({
  type: z.literal('boolean'),
  defaultValue: z.boolean().optional(),
});

export const SKUImageFieldSchema = SKUInputFieldBaseSchema.extend({
  type: z.literal('image'),
  constraints: SKUImageConstraintsSchema.optional(),
});

export const SKUInputFieldSchema = z.discriminatedUnion('type', [
  SKUTextFieldSchema,
  SKUNumberFieldSchema,
  SKUSelectFieldSchema,
  SKUColorFieldSchema,
  SKUBooleanFieldSchema,
  SKUImageFieldSchema,
]);

export const SKUOutputSpecSchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

export const SKUInputSchemaDefinitionSchema = z.object({
  fields: z.array(SKUInputFieldSchema),
  outputs: z.array(SKUOutputSpecSchema).optional().default([]),
});

export const CreateSKUSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  inputSchema: SKUInputSchemaDefinitionSchema,
  workflowIds: z.array(z.string()).optional().default([]),
});

export const UpdateSKUSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  inputSchema: SKUInputSchemaDefinitionSchema.optional(),
});

export const SKUParamsSchema = z.object({
  id: z.string().min(1),
});

export const SKUQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export const SKUWorkflowsParamsSchema = z.object({
  id: z.string().min(1),
  workflowId: z.string().min(1),
});

export const AddWorkflowToSKUSchema = z.object({
  workflowId: z.string().min(1),
});

export type CreateSKUInput = z.infer<typeof CreateSKUSchema>;
export type UpdateSKUInput = z.infer<typeof UpdateSKUSchema>;
export type SKUParams = z.infer<typeof SKUParamsSchema>;
export type SKUQuery = z.infer<typeof SKUQuerySchema>;
export type SKUWorkflowsParams = z.infer<typeof SKUWorkflowsParamsSchema>;
export type AddWorkflowToSKUInput = z.infer<typeof AddWorkflowToSKUSchema>;
