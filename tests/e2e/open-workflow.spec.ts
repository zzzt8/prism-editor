import { test, expect, Page } from '@playwright/test';

/**
 * 路径 3: 打开并查看工作流详情
 *
 * 用户目标：用户能够从列表中打开一个已存在的工作流，并在编辑器中查看节点。
 */

// 辅助函数：创建一个工作流并返回工作流 ID
async function createWorkflowAndReturnId(page: Page, name: string = 'Test Workflow'): Promise<string> {
  await page.goto('/');

  // 如果在登录页，先登录
  if (page.url().includes('/login')) {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 5000 });
  }

  // 点击新建
  await page.locator('button:has-text("New Workflow")').click();

  // 输入名称
  await page.locator('.new-modal input[type="text"]').fill(name);

  // 点击创建
  await page.locator('.new-btn-create').click();

  // 等待跳转到编辑器
  await page.waitForURL(/\/workflow\/.+/, { timeout: 5000 });

  // 提取工作流 ID
  const match = page.url().match(/\/workflow\/(.+)/);
  return match ? match[1] : '';
}

test.describe('打开并查看工作流详情', () => {
  test.beforeEach(async ({ page }) => {
    // 确保有一个工作流可以打开
    await createWorkflowAndReturnId(page, `E2E Test ${Date.now()}`);
  });

  test('工作流编辑器页面正确加载', async ({ page }) => {
    // 应该已经在编辑器页面
    await expect(page).toHaveURL(/\/workflow\/.+/);

    // ReactFlow 画布应该可见
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 5000 });
  });

  test('节点面板可见', async ({ page }) => {
    // 左侧面板应该可见
    const leftPanel = page.locator('.dev-tool-layout__left, [class*="node-panel"]');
    await expect(leftPanel.first()).toBeVisible({ timeout: 5000 });
  });

  test('参数面板可见', async ({ page }) => {
    // 右侧面板应该可见
    const rightPanel = page.locator('.dev-tool-layout__right, [class*="inspector"]');
    await expect(rightPanel.first()).toBeVisible({ timeout: 5000 });
  });

  test('画布工具栏可见', async ({ page }) => {
    // 工具栏应该可见
    const toolbar = page.locator('[class*="toolbar"], [class*="canvas-toolbar"]');
    await expect(toolbar.first()).toBeVisible({ timeout: 5000 });
  });

  test('可以返回工作流列表', async ({ page }) => {
    // 点击 Logo 返回首页
    const logo = page.locator('.home-logo-text, [class*="logo"]').first();
    await logo.click();

    // 应该跳转到首页
    await expect(page).toHaveURL('/', { timeout: 5000 });

    // 工作流列表应该可见
    await expect(page.locator('.home-layout')).toBeVisible({ timeout: 5000 });
  });

  test('工作流列表显示刚创建的工作流', async ({ page }) => {
    // 返回首页
    const logo = page.locator('.home-logo-text, [class*="logo"]').first();
    await logo.click();

    // 应该看到刚创建的工作流
    await expect(page.locator('.home-workflow-name').first()).toBeVisible({ timeout: 5000 });
  });

  test('点击工作流可以重新打开', async ({ page }) => {
    // 返回首页
    const logo = page.locator('.home-logo-text, [class*="logo"]').first();
    await logo.click();

    // 点击第一个工作流
    const firstWorkflow = page.locator('.home-workflow-row').first();
    await firstWorkflow.click();

    // 应该重新进入编辑器
    await expect(page).toHaveURL(/\/workflow\/.+/, { timeout: 5000 });
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 5000 });
  });
});
