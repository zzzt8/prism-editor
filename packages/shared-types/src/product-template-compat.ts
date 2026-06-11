import type {
  DesignParam,
  DesignParamValueType,
  ProductTemplate,
  ProductTemplateDesignParamBinding,
  ProductTemplateInput,
  ProductTemplateInputBinding,
  ProductTemplateInputType,
} from './product-template';
import type {
  PublishedInputConfig,
  PublishedParamConfig,
  PublishedParamDefinition,
  PublishedWorkflow,
} from './published';

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

function mapPublishedParamType(
  definition?: PublishedParamDefinition
): DesignParamValueType {
  switch (definition?.controlType) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'select':
      return 'select';
    case 'string':
      return 'string';
    case 'image-file':
    default:
      return 'string';
  }
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

function getPublishedInputs(published: PublishedWorkflow): PublishedInputConfig[] {
  const { inputs } = published.config as unknown as { inputs?: unknown };
  return Array.isArray(inputs) ? inputs as PublishedInputConfig[] : [];
}

function getPublishedExposedParams(published: PublishedWorkflow): PublishedParamConfig[] {
  const { exposedParams } = published.config as unknown as { exposedParams?: unknown };
  return Array.isArray(exposedParams) ? exposedParams as PublishedParamConfig[] : [];
}

function getPublishedParamDefinitions(
  published: PublishedWorkflow
): PublishedParamDefinition[] {
  const { paramDefinitions } = published.config as unknown as { paramDefinitions?: unknown };
  return Array.isArray(paramDefinitions) ? paramDefinitions as PublishedParamDefinition[] : [];
}

function buildPublishedParamDefinitionMap(
  definitions: PublishedParamDefinition[]
): Map<string, PublishedParamDefinition> {
  return new Map(
    definitions.map((definition) => [`${definition.nodeId}:${definition.paramId}`, definition])
  );
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

function mapPublishedInputBinding(
  input: PublishedInputConfig
): ProductTemplateInputBinding {
  return {
    inputId: input.nodeId,
    target: {
      type: 'published-input',
      id: input.nodeId,
    },
  };
}

function mapPublishedParam(
  exposedParam: PublishedParamConfig,
  definition?: PublishedParamDefinition
): DesignParam {
  return {
    id: `${exposedParam.nodeId}:${exposedParam.paramId}`,
    name: exposedParam.label,
    type: mapPublishedParamType(definition),
    label: exposedParam.label,
    description: definition?.description,
    defaultValue: definition?.defaultValue,
    required: definition?.validation?.required,
    options: definition?.options
      ?.filter(
        (
          option
        ): option is { label: string; value: string | number | boolean } =>
          typeof option.value === 'string' ||
          typeof option.value === 'number' ||
          typeof option.value === 'boolean'
      )
      .map((option) => ({
        label: option.label,
        value: option.value,
      })),
    constraints: definition?.validation
      ? {
          min: definition.validation.min,
          max: definition.validation.max,
          pattern: definition.validation.pattern,
        }
      : undefined,
  };
}

function mapPublishedParamBinding(
  exposedParam: PublishedParamConfig
): ProductTemplateDesignParamBinding {
  return {
    designParamId: `${exposedParam.nodeId}:${exposedParam.paramId}`,
    target: {
      type: 'exposed-param',
      exposedParamId: `${exposedParam.nodeId}:${exposedParam.paramId}`,
    },
  };
}

export function createProductTemplateFromPublishedWorkflow(
  published: PublishedWorkflow
): ProductTemplate {
  const publishedInputs = getPublishedInputs(published);
  const exposedParams = getPublishedExposedParams(published);
  const paramDefinitionMap = buildPublishedParamDefinitionMap(
    getPublishedParamDefinitions(published)
  );

  const inputs = publishedInputs.map(mapPublishedInput);
  const designParams = exposedParams.map((exposedParam) =>
    mapPublishedParam(
      exposedParam,
      paramDefinitionMap.get(`${exposedParam.nodeId}:${exposedParam.paramId}`)
    )
  );

  return {
    id: published.id || published.sourceId,
    name: getPublishedWorkflowName(published),
    description: published.description,
    version: published.version || '1.0.0',
    inputs,
    assets: [],
    designParams,
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
        bindings: {
          inputs: publishedInputs.map(mapPublishedInputBinding),
          designParams: exposedParams.map(mapPublishedParamBinding),
        },
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
