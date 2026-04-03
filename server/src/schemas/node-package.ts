import { z } from 'zod';

// Local Zod schema matching NodePackageManifest structure from @prism/shared-types
const ExecutorSourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('inline'),
    code: z.string().min(1),
  }),
  z.object({
    type: z.literal('url'),
    url: z.string().url(),
  }),
]);

const NodePackageManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string(),
  definitions: z.array(z.any()),
  executors: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      version: z.string().optional(),
      source: ExecutorSourceSchema,
      description: z.string().optional(),
      dependencies: z.record(z.string(), z.string()).optional(),
    })
  ),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
  executorDependencies: z.record(z.string(), z.string()).optional(),
});

export const CreateNodePackageSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().default('custom'),
  manifest: NodePackageManifestSchema,
  version: z.string().default('1.0.0'),
});

export const UpdateNodePackageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  manifest: NodePackageManifestSchema.optional(),
  version: z.string().optional(),
});

export const NodePackageParamsSchema = z.object({
  id: z.string().min(1),
});

export const NodePackageQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'name']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateNodePackageInput = z.infer<typeof CreateNodePackageSchema>;
export type UpdateNodePackageInput = z.infer<typeof UpdateNodePackageSchema>;
export type NodePackageParams = z.infer<typeof NodePackageParamsSchema>;
export type NodePackageQuery = z.infer<typeof NodePackageQuerySchema>;
