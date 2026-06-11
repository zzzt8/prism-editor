// Simple hash-based router for the user app.
//
// Route format:
//   #/               → list page
//   #/workflow/:id   → published workflow run page
//   #/templates/     → product template list page
//   #/template/:id    → product template run page
//
// No external router dependency — pure URL hash manipulation.

export type Route =
  | { kind: 'list' }
  | { kind: 'run'; publishedId: string }
  | { kind: 'template-list' }
  | { kind: 'template-run'; templateId: string };

export function parseRoute(): Route {
  const hash = window.location.hash;

  // Template run: #/template/:id
  const templateMatch = hash.match(/^#\/template\/(.+)$/);
  if (templateMatch) {
    try {
      return { kind: 'template-run', templateId: decodeURIComponent(templateMatch[1]) };
    } catch {
      return { kind: 'template-run', templateId: templateMatch[1] };
    }
  }

  // Template list: #/templates/
  if (hash === '#/templates/' || hash === '#/templates') {
    return { kind: 'template-list' };
  }

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

export function navigateToTemplateList(): void {
  window.location.hash = '#/templates/';
}

export function navigateToTemplate(templateId: string): void {
  window.location.hash = `#/template/${encodeURIComponent(templateId)}`;
}
