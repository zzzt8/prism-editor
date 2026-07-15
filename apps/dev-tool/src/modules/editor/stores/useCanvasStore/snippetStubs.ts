// Snippet stubs — all snippet features are stubbed out.
// Split from useCanvasStore.ts (lines 1348-1353)
// These exist as no-op placeholders while the snippet feature is not implemented.

/** No-op: save a node selection as a named snippet. */
export async function snippetSave(
  _name: string,
  _description: string,
  _selectedNodeIds: string[],
): Promise<void> {}

/** No-op: list all saved snippets. */
export async function snippetList(): Promise<never[]> {
  return [];
}

/** No-op: insert a snippet at the given canvas position. */
export async function insertSnippet(
  _id: string,
  _position: { x: number; y: number },
): Promise<void> {}

/** No-op: delete a saved snippet. */
export async function deleteSnippet(_id: string): Promise<void> {}
