import { test, expect } from '@playwright/test';

/**
 * T2.7 — E2E: Render Template
 * Verifies POST /api/render/template API endpoint behavior.
 * Note: Full render testing (with real workflow nodes) is manual/separate.
 */
test.describe('Render Template API', () => {
  test('POST /api/render/template returns 404 for non-existent template', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/render/template', {
      headers: {
        'x-prism-secret': 'dev-secret',
        'content-type': 'application/json',
      },
      data: { templateId: 'non-existent-id-12345' },
    });

    // Non-existent template should return 404
    expect(res.status()).toBe(404);
  });
});
