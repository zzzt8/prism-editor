// Simple hash-based router for the user app.
//
// Route format:
//   #/               → list page
//   #/workflow/:id   → run page
//
// No external router dependency — pure URL hash manipulation.

export type Route = { kind: 'list' } | { kind: 'run'; sourceId: string };

export function parseRoute(): Route {
  const hash = window.location.hash;
  const match = hash.match(/^#\/workflow\/(.+)$/);
  if (match) {
    try {
      return { kind: 'run', sourceId: decodeURIComponent(match[1]) };
    } catch {
      // Invalid URL encoding, treat as literal string
      return { kind: 'run', sourceId: match[1] };
    }
  }
  return { kind: 'list' };
}

export function navigateToList(): void {
  window.location.replace(window.location.pathname + window.location.search + '#/');
}

export function navigateToWorkflow(sourceId: string): void {
  window.location.hash = `#/workflow/${encodeURIComponent(sourceId)}`;
}
