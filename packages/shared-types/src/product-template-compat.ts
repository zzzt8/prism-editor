import type {
  ProductTemplate,
  ProductTemplateInput,
  ProductTemplateInputType,
} from './product-template';
import type { PublishedInputConfig, PublishedWorkflow } from './published';

function mapPublishedInputType(type: PublishedInputConfig['type']): ProductTemplateInputType {
  switch (type) {
    case 'image':
    case 'mask':
    case 'string':
      return type;
    default:
      return 'json';
  }
}

function mapPublishedInput(input: PublishedInputConfig): ProductTemplateInput {
  return {
    id: input.nodeId,
    name: input.label,
    type: mapPublishedInputType(input.type),
    label: input.label,
    required: true,
  };
}

function getPublishedWorkflowName(published: PublishedWorkflow): string {
  const metadataRecord = (published.config as unknown as { metadata?: unknown }).metadata;

  if (published.name?.trim()) {
    return published.name;
  }

  if (metadataRecord && typeof metadataRecord === 'object') {
    const metadataName = (metadataRecord as Record<string, unknown>).name;
    if (typeof metadataName === 'string' && metadataName.trim()) {
      return metadataName;
    }
  }

  return published.sourceName;
}

export function createProductTemplateFromPublishedWorkflow(
  published: PublishedWorkflow
): ProductTemplate {
  return {
    id: published.id || published.sourceId,
    name: getPublishedWorkflowName(published),
    description: published.description,
    version: published.version || '1.0.0',
    inputs: published.config.inputs.map(mapPublishedInput),
    assets: [],
    designParams: [],
    preview: {
      canvas: {
        width: 1920,
        height: 1080,
        background: 'transparent',
        fit: 'contain',
      },
      flow: {
        type: 'published-workflow',
        publishedWorkflowId: published.id,
        workflowVersion: published.version,
        notes: 'Transitional wrapper for legacy published workflow preview flow.',
      },
    },
    production: {
      output: {
        format: 'png',
        outputs: [],
        notes: 'Production output is not enabled in Product Template v1 transitional compatibility mode.',
      },
      flow: {
        type: 'none',
        notes: 'Production flow is intentionally disabled during the PublishedWorkflow compatibility phase.',
      },
    },
    createdAt: published.publishedAt,
    updatedAt: published.publishedAt,
  };
}
