# workflow-core-explicit-flow-resolution Specification

## Purpose
TBD - created by archiving change m2-b-workflow-core-explicit-flow-resolution. Update Purpose after archive.
## Requirements
### Requirement: resolveFlow uses exact key match

The system SHALL provide a `resolveFlow(templateVersion, flowKey)` function that locates a `Flow` by exact key match within a `TemplateVersion`. The system SHALL NOT use `findFirst` or iteration order to determine the result.

#### Scenario: resolveFlow exact hit

- **WHEN** `resolveFlow(templateVersion, 'production.print')` is called
- **AND** `templateVersion.flows` contains exactly one entry with `flowKey === 'production.print'`
- **THEN** the function returns that `Flow` entry

#### Scenario: resolveFlow exact miss

- **WHEN** `resolveFlow(templateVersion, 'nonexistent')` is called
- **AND** no entry in `templateVersion.flows` has `flowKey === 'nonexistent'`
- **THEN** the function throws `FlowResolverError` with `code: 'FLOW_NOT_FOUND'`

---

### Requirement: outputs collected in Flow.explicitOutputs declaration order

The system SHALL collect `RenderResult.outputs` in the order declared by `flow.explicitOutputs`, filtered by `requestedOutputSlots`. The system SHALL NOT use the order of `requestedOutputSlots`, object key iteration, or node execution completion to determine output order.

#### Scenario: requestedOutputSlots order does not affect output order

- **WHEN** a render has `requestedOutputSlots === ['b', 'a']`
- **AND** `flow.explicitOutputs` declares `['a', 'b']` in that order
- **THEN** `RenderResult.outputs[0].slot === 'a'`
- **AND** `RenderResult.outputs[1].slot === 'b'`

#### Scenario: node completion order does not affect output order

- **WHEN** executor completes nodes in non-declaration order
- **THEN** `RenderResult.outputs` still follows `flow.explicitOutputs` declaration order

---

### Requirement: stable error codes

The system SHALL emit stable error codes from `FLOW_RESOLVER_ERROR_CODES` when a flow resolution or output collection error occurs. Codes MUST be one of: `FLOW_NOT_FOUND`, `DUPLICATE_FLOW_KEY`, `FLOW_OUTPUTS_MISSING`, `OUTPUT_SLOT_DUPLICATE`, `OUTPUT_NODE_NOT_FOUND`, `OUTPUT_PORT_NOT_FOUND`, `REQUESTED_OUTPUT_UNKNOWN`, `DECLARED_OUTPUT_NOT_PRODUCED`.

#### Scenario: declared output not produced

- **WHEN** `flow.explicitOutputs` declares `[{ slot: 'print', nodeId: 'export', port: 'image' }]`
- **AND** the executor completes but `results['export']` is absent
- **THEN** `FlowResolverError` with `code: 'DECLARED_OUTPUT_NOT_PRODUCED'` is thrown

