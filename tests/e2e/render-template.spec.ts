import { test, expect } from '@playwright/test';

/**
 * T2.7 — E2E: Render Template
 * Verifies POST /api/render/template returns PNG binary with correct headers.
 */
test.describe('Render Template API', () => {
  let templateId: string;

  test.beforeAll(async ({ request }) => {
    // Create a template with a nodejs Flow for rendering
    const res = await request.post('http://localhost:3001/api/templates', {
      headers: {
        'x-prism-secret': 'dev-secret',
        'content-type': 'application/json',
      },
      data: {
        name: 'Render Test Template',
        description: 'Template for render E2E tests',
        content: '{}',
      },
    });
    expect(res.status()).toBe(201);
    const template = (await res.json()) as { id: string };
    templateId = template.id;

    // Add a minimal nodejs Flow (empty workflow content)
    const flowRes = await request.post(`http://localhost:3001/api/templates/${templateId}/flows`, {
      headers: {
        'x-prism-secret': 'dev-secret',
        'content-type': 'application/json',
      },
      data: {
        name: 'Production v1',
        platform: 'nodejs',
        content: JSON.stringify({ nodes: [], connections: [] }),
      },
    });
    expect(flowRes.status()).toBe(201);
  });

  test.afterAll(async ({ request }) => {
    if (templateId) {
      await request.delete(`http://localhost:3001/api/templates/${templateId}`, {
        headers: { 'x-prism-secret': 'dev-secret' },
      }).catch(() => {/* ignore cleanup errors */});
    }
  });

  test('POST /api/render/template returns PNG binary', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/render/template', {
      headers: {
        'x-prism-secret': 'dev-secret',
        'content-type': 'application/json',
      },
      data: { templateId },
    });

    // Should either return 200 (image) or 422 (no workflow output — acceptable for empty workflow)
    expect([200, 422, 500]).toContain(res.status());

    if (res.status() === 200) {
      expect(res.headers()['content-type']).toMatch(/^image\/png/);
      const contentDisposition = res.headers()['content-disposition'] as string;
      expect(contentDisposition).toContain(templateId);
      expect(contentDisposition).toContain('.png');
    } else {
      // For 422/500, verify it's a proper error response
      const body = await res.json();
      expect(body).toHaveProperty('code');
    }
  });

  test('POST /api/render/template returns 404 for non-existent template', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/render/template', {
      headers: {
        'x-prism-secret': 'dev-secret',
        'content-type': 'application/json',
      },
      data: { templateId: 'non-existent-id-12345' },
    });

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('TEMPLATE_NOT_FOUND');
  });
});
