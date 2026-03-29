## 1. Type Definitions — Extend PublishedConfig

- [x] 1.1 Add `PublishedInputConfig` type to `packages/shared-types/src/published.ts`:
  `nodeId: string`, `label: string`, `type: 'image' | 'text'`
- [x] 1.2 Add `PublishedParamConfig` type:
  `nodeId: string`, `paramId: string`, `label: string`
- [x] 1.3 Add `PublishedOutputConfig` type:
  `nodeId: string`, `label: string`, `format: 'png' | 'jpeg' | 'webp'`
- [x] 1.4 Extend `PublishedConfig` interface to add:
  `inputs: PublishedInputConfig[]`, `exposedParams: PublishedParamConfig[]`, `outputs: PublishedOutputConfig[]`
- [x] 1.5 Add `export type ExportFormat = 'png' | 'jpeg' | 'webp'` for the format selector

## 2. Helper Functions — Auto-Infer & Build

- [x] 2.1 Write `inferSourceNodes(nodes, edges)` in `PublishDialog.tsx`:
  Returns nodes with zero incoming edges OR `category === 'INPUT'` (load-image, load-mask)
- [x] 2.2 Write `inferOutputNodes(nodes, edges)` in `PublishDialog.tsx`:
  Returns `type === 'export'` nodes first; falls back to leaf nodes (zero outgoing edges)
- [x] 2.3 Write `buildPublishedConfig(inputs, exposedParams, outputs, nodes, edges)`:
  Generates the new `PublishedConfig` shape using canvas `node.id` (UUID) as the stable key for nodeTypes and nodeConfigs. Preserves existing `connections` array for executor compatibility.

## 3. PublishDialog State — New Data Shape

- [x] 3.1 Replace `visibility` state with `whitelist: PublishedParamConfig[]`
- [x] 3.2 Add `inputLabels: Record<nodeId, string>`
- [x] 3.3 Add `outputLabels: Record<nodeId, string>`
- [x] 3.4 Add `outputFormats: Record<nodeId, ExportFormat>`
- [x] 3.5 Add `nodeBrowserOpen: boolean`
- [x] 3.6 Add `browserChecked` / `whitelistLabels` for browser interaction

## 4. PublishDialog UI — Three Sections

### Section 1: 定义用户上传内容 (Inputs)
- [x] 4.1 Display auto-detected source nodes as cards with category icon + node label
- [x] 4.2 Each card shows a required `visible label` text input (placeholder: "面向用户的名称，如：产品白底图")
- [x] 4.3 If zero source nodes detected, show message: "未检测到图片上传节点，请在画布中添加 Load Image 节点"
- [x] 4.4 Show empty state message when whitelist is empty: "暂无对用户开放的参数"
- [x] 4.5 Render `+ 添加向用户暴露的参数` button
- [x] 4.6 When clicked, expand collapsible node-browser panel listing all nodes with their params:
  - Node header row with icon + node label
  - Param checkbox + param name for each param
  - When checked: inline label input appears (placeholder: "面向用户的参数名称")
- [x] 4.7 White-listed params shown as editable rows above the button:
  - Shows "[节点名] → 参数中文名" with edit (pencil) and remove (X) buttons
- [x] 4.8 Validation: block publish if any white-list entry has empty label
- [x] 4.9 Display auto-detected output nodes as cards with export format selector (PNG / JPEG / WebP)
- [x] 4.10 Each card has a required visible label input
- [x] 4.11 If zero output nodes detected, show message: "未检测到输出节点，请确保画布中有 Export 节点或末端节点"
- [x] 4.12 Fix the "无可用输出端口" false-negative by correctly using `inferOutputNodes`

## 5. Validation & Publish Handler

- [x] 5.1 Validate all `inputLabels` are non-empty before publish
- [x] 5.2 Validate all `outputLabels` are non-empty before publish
- [x] 5.3 Validate all `whitelist` param labels are non-empty before publish
- [x] 5.4 Rewrite `handlePublish` to call `buildPublishedConfig` and assign result to `pw.config`
- [x] 5.5 Preserve backward compatibility: `pw.inputs` and `pw.outputs` arrays are populated from the new config for the user-app consumer

## 6. User-App Integration

- [x] 6.1 Update `InputSection` (`apps/user-app/src/components/InputSection/index.tsx`) to consume `PublishedInputConfig[]` from `config.inputs` instead of the old `inputs[]` array
- [x] 6.2 Update `WorkflowRunPage` to pass `config.exposedParams` as `exposedParams` to `PublishedWorkflowExecutor`
- [x] 6.3 Update output rendering to read labels from `config.outputs` instead of old `outputs[]` array
- [x] 6.4 Verify blob URL injection still works: executor reads `config.inputs[].nodeId` to inject user URL into `load-image` nodes

## 7. CSS Styles

- [x] 7.1 Add styles for the three-section dialog layout
- [x] 7.2 Style source/output node cards with icon, label, and visible label input
- [x] 7.3 Style the param white-list panel and node-browser expandable section
- [x] 7.4 Style editable white-list rows with edit/remove buttons
- [x] 7.5 Style validation error states inline within the dialog

## 8. Cleanup & Verification

- [x] 8.1 Remove old `buildPublishedInputs`, `buildPublishedOutputs` helper functions (replaced by infer functions) — already removed
- [x] 8.2 Remove old `visibility` state and `toggleParam` function — already removed
- [x] 8.3 Remove "参数可见性" section from the dialog UI — already removed
- [x] 8.4 TypeScript check: `tsc --noEmit` passes for all affected packages (pre-existing errors in unrelated files are excluded)
- [ ] 8.5 Test: open dialog with a canvas containing load-image + composite + export nodes; verify correct auto-detection
- [ ] 8.6 Test: add a param to white-list; verify label validation; verify it appears in user app
