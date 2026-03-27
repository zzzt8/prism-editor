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
    return { kind: 'run', sourceId: decodeURIComponent(match[1]) };
  }
  return { kind: 'list' };
}

export function navigateToList(): void {
  // Idempotent: skip if already on list page to avoid unnecessary hashchange cycles.
  if (window.location.hash === '#/' || window.location.hash === '#') {
    return;
  }
  window.location.hash = '/';
}

export function navigateToWorkflow(sourceId: string): void {
  window.location.hash = `/workflow/${encodeURIComponent(sourceId)}`;
}
