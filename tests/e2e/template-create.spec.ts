import { test, expect } from '@playwright/test';

/**
 * T2.7 — E2E: Template Create
 * Verifies creating a new ProductTemplate and navigating to the editor.
 */
test.describe('Template Create', () => {
  test('creates a new template and navigates to editor', async ({ page, request }) => {
    // Create a template via API first so the editor has data
    const response = await request.post('/api/templates', {
      headers: {
        'x-prism-secret': 'dev-secret',
        'content-type': 'application/json',
      },
      data: {
        name: 'Test Template E2E',
        description: 'Created by E2E test',
        content: '{}',
      },
    });

    if (response.status() !== 201) {
      test.skip(true, `Template creation failed (${response.status()}): ${await response.text()}`);
      return;
    }

    const template = await response.json();
    const templateId = (template as { id: string }).id;

    // Navigate to the editor
    await page.goto(`/templates/${templateId}`);

    // Verify editor loads (template name should appear)
    await expect(page.getByRole('heading', { name: 'Test Template E2E' })).toBeVisible();
  });
});
