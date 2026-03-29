# Publish Dialog — Auto-Infer Inputs & Outputs

## ADDED Requirements

### Requirement: Source node auto-detection for Inputs

The publish dialog SHALL automatically detect source nodes from the React Flow canvas graph and present them as user-facing Inputs without exposing raw pipeline ports.

A source node is defined as a node with zero incoming edges, OR a node whose type is `load-image`, regardless of edge count.

#### Scenario: Single load-image source node
- **WHEN** the canvas contains a single `load-image` node with no incoming edges
- **THEN** the Inputs section displays exactly one entry for that node
- **AND** the entry shows the node's label (e.g., "Load Image") with a required visible label input field

#### Scenario: Multiple source nodes
- **WHEN** the canvas contains two or more source nodes (e.g., two unconnected `load-image` nodes)
- **THEN** the Inputs section displays one entry for each source node
- **AND** each entry is independent with its own visible label field

#### Scenario: Source node has incoming edges
- **WHEN** a `load-image` node has incoming edges (e.g., connected to a control node)
- **THEN** the Inputs section STILL displays it as a source node (load-image type takes priority)

#### Scenario: Mid-graph node with no incoming edges but internal ports
- **WHEN** a node with no incoming edges but type is NOT `load-image` (e.g., a math/utility node)
- **THEN** it SHALL NOT appear as an Input unless explicitly added by the developer

### Requirement: Output node auto-detection

The publish dialog SHALL automatically detect output/leaf nodes from the React Flow canvas graph.

Detection priority:
1. Nodes with `type === 'export'` are always treated as output nodes.
2. If no `export` nodes exist, nodes with zero outgoing edges (leaf nodes) are treated as output nodes.
3. Nodes that are both source and output (loops) are excluded from both lists.

#### Scenario: Export node detected as output
- **WHEN** the canvas contains a node with `type === 'export'`
- **THEN** the Outputs section displays exactly one entry for that export node
- **AND** the entry includes an export format selector (PNG / JPEG / WebP, defaulting to PNG)

#### Scenario: No export node, leaf nodes shown as output
- **WHEN** the canvas has no `export` node but has nodes with zero outgoing edges
- **THEN** the Outputs section displays one entry for each leaf node
- **AND** each entry includes an export format selector

#### Scenario: Canvas with no outputable nodes
- **WHEN** every node on the canvas has outgoing edges (no leaves, no export)
- **THEN** the Outputs section displays a message: "未检测到输出节点，请确保画布中有 Export 节点或末端节点"

#### Scenario: Output entry format selector
- **WHEN** an output node entry is displayed
- **THEN** the developer can select export format from { PNG, JPEG, WebP }
- **AND** the default format is PNG

### Requirement: Visible label required for every input/output

Each auto-detected Input and Output entry SHALL display a required text input for the developer to provide a user-facing visible label.

#### Scenario: Developer must fill label before publishing
- **WHEN** the developer clicks "发布" with an empty visible label on any input or output
- **THEN** the dialog shows a validation error: "请为 [节点名称] 设置面向用户的名称"
- **AND** publishing is blocked until all labels are filled

#### Scenario: Label propagates to user app
- **WHEN** the developer sets visible label "产品白底图" for a source node
- **THEN** the user app displays this label (not the raw node name) in the input section
