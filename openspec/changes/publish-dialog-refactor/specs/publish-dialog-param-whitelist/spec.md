# Publish Dialog — Parameter White-list Mechanism

## ADDED Requirements

### Requirement: All parameters default to hidden

The publish dialog SHALL hide all node parameters by default. No parameter appears in the user app unless the developer explicitly adds it to a white-list.

#### Scenario: Empty parameter section on open
- **WHEN** the developer opens the publish dialog
- **THEN** the "开放给用户的调节参数" section shows the message: "暂无对用户开放的参数"
- **AND** no parameter rows are displayed by default

### Requirement: White-list panel to add parameters

The publish dialog SHALL provide a `+ 添加向用户暴露的参数` button that opens a node-browser panel listing all nodes and their available parameters.

#### Scenario: Node-browser shows all nodes and params
- **WHEN** the developer clicks `+ 添加向用户暴露的参数`
- **THEN** a collapsible in-dialog panel expands below the button
- **AND** it displays a list of all nodes with their category icons
- **AND** each node lists all of its parameters with a checkbox

#### Scenario: Parameter checked with required label
- **WHEN** the developer checks a parameter checkbox
- **THEN** an inline text input appears immediately below the checkbox
- **AND** the input placeholder reads "面向用户的参数名称"
- **AND** the parameter is NOT added to the white-list until a label is entered

#### Scenario: Label required for param to be white-listed
- **WHEN** the developer checks a parameter but leaves the label input empty
- **AND** clicks "发布"
- **THEN** the dialog shows a validation error: "请为 [节点名称] → [参数名称] 设置面向用户的参数名称"
- **AND** publishing is blocked

#### Scenario: Multiple params can be added from different nodes
- **WHEN** the developer checks "opacity" on node A and "width" on node B
- **THEN** both params appear in the white-list section
- **AND** each maintains its separate node association and label

### Requirement: White-list section shows added parameters

The "开放给用户的调节参数" section SHALL display all currently white-listed parameters as editable rows.

#### Scenario: Added param appears as editable row
- **WHEN** the developer adds a parameter with label "透明度" via the node-browser panel
- **THEN** a row appears in the white-list section showing: "[Load Image] → 透明度"
- **AND** the row has an edit button (pencil icon) to change the label
- **AND** the row has a remove button (X) to un-expose the parameter

#### Scenario: Remove param from white-list
- **WHEN** the developer clicks the X button on a white-listed param row
- **THEN** the row is removed from the white-list
- **AND** the checkbox in the node-browser panel is automatically unchecked

#### Scenario: Edit white-listed param label
- **WHEN** the developer clicks the edit button on a white-listed param row
- **THEN** the label becomes an inline text input
- **AND** pressing Enter or clicking away saves the new label

### Requirement: White-list persisted in PublishedWorkflow config

All white-listed parameters SHALL be serialized into the PublishedWorkflow config with their nodeId, paramId, and user-facing label.

#### Scenario: White-list serialized on publish
- **WHEN** the developer publishes with white-listed params: opacity (node: abc, label: "透明度"), mode (node: xyz, label: "混合模式")
- **THEN** the PublishedWorkflow config contains an `exposedParams` array with entries: `{ nodeId, paramId: 'opacity', label: '透明度' }`, `{ nodeId, paramId: 'mode', label: '混合模式' }`
- **AND** the user app receives these params and renders them with the developer-specified labels
