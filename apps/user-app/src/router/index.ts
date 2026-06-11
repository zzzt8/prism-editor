// Simple hash-based router for the user app.
//
// Route format:
//   #/               → list page
//   #/workflow/:id    → published workflow run page
//
// No external router dependency — pure URL hash manipulation.

export type Route =
  | { kind: 'list' }
  | { kind: 'run'; publishedId: string };

export function parseRoute(): Route {
  const hash = window.location.hash;

  // Workflow run: #/workflow/:id
  const workflowMatch = hash.match(/^#\/workflow\/(.+)$/);
  if (workflowMatch) {
    try {
      return { kind: 'run', publishedId: decodeURIComponent(workflowMatch[1]) };
    } catch {
      return { kind: 'run', publishedId: workflowMatch[1] };
    }
  }

  return { kind: 'list' };
}

export function navigateToList(): void {
  window.location.replace(window.location.pathname + window.location.search + '#/');
}

export function navigateToWorkflow(publishedId: string): void {
  window.location.hash = `#/workflow/${encodeURIComponent(publishedId)}`;
}
