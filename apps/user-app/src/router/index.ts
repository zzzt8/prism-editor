// Simple hash-based router for the user app.
//
// Route format:
//   #/               → list page
//   #/workflow/:id   → run page
//
// No external router dependency — pure URL hash manipulation.

export type Route = { kind: 'list' } | { kind: 'run'; publishedId: string };

export function parseRoute(): Route {
  const hash = window.location.hash;
  const match = hash.match(/^#\/workflow\/(.+)$/);
  if (match) {
    try {
      return { kind: 'run', publishedId: decodeURIComponent(match[1]) };
    } catch {
      // Invalid URL encoding, treat as literal string
      return { kind: 'run', publishedId: match[1] };
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
