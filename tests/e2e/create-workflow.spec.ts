import { test, expect, Page } from '@playwright/test';

/**
 * 路径 2: 创建新工作流
 *
 * 用户目标：用户能够创建一个空白工作流并跳转到编辑器页面。
 */

// 辅助函数：登录并到达首页
async function loginAndNavigateToHome(page: Page) {
  // 直接访问首页，因为 AuthGuard 会重定向到登录
  await page.goto('/');

  // 如果在登录页，先登录
  if (page.url().includes('/login')) {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 5000 });
  }
}

test.describe('创建新工作流', () => {
  test.beforeEach(async ({ page }) => {
    // 登录并到达首页
    await loginAndNavigateToHome(page);
  });

  test('新建按钮存在且可点击', async ({ page }) => {
    const newButton = page.locator('button:has-text("New Workflow")');
    await expect(newButton).toBeVisible();
  });

  test('点击新建按钮打开 Modal', async ({ page }) => {
    await page.locator('button:has-text("New Workflow")').click();

    // Modal 应该打开
    const modal = page.locator('.new-modal');
    await expect(modal).toBeVisible();

    // 标题应该可见
    await expect(page.locator('.new-modal-title')).toContainText('New Workflow');
  });

  test('Modal 表单元素完整', async ({ page }) => {
    await page.locator('button:has-text("New Workflow")').click();

    // 工作流名称输入框
    await expect(page.locator('.new-modal input[type="text"]')).toBeVisible();

    // Category 选择器
    await expect(page.locator('.new-select')).toBeVisible();

    // 目标平台单选按钮
    await expect(page.locator('.new-radio').first()).toBeVisible();

    // 创建按钮（初始应该禁用）
    const createButton = page.locator('.new-btn-create');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeDisabled();
  });

  test('输入名称后创建按钮启用', async ({ page }) => {
    await page.locator('button:has-text("New Workflow")').click();

    // 输入工作流名称
    await page.locator('.new-modal input[type="text"]').fill('My Test Workflow');

    // 创建按钮应该启用
    const createButton = page.locator('.new-btn-create');
    await expect(createButton).toBeEnabled();
  });

  test('可以选择目标平台', async ({ page }) => {
    await page.locator('button:has-text("New Workflow")').click();

    // 默认选中 Frontend Preview
    const frontendRadio = page.locator('.new-radio').first();
    await expect(frontendRadio).toHaveClass(/new-radio--selected/);

    // 点击 Backend 选项
    await page.locator('.new-radio').last().click();
    await expect(page.locator('.new-radio').last()).toHaveClass(/new-radio--selected/);
  });

  test('创建工作流后跳转到编辑器', async ({ page }) => {
    await page.locator('button:has-text("New Workflow")').click();

    // 输入名称
    await page.locator('.new-modal input[type="text"]').fill('E2E Test Workflow');

    // 点击创建
    await page.locator('.new-btn-create').click();

    // 应该跳转到编辑器页面
    await expect(page).toHaveURL(/\/workflow\/.+/, { timeout: 5000 });

    // 编辑器画布应该可见
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 5000 });
  });

  test('取消按钮关闭 Modal', async ({ page }) => {
    await page.locator('button:has-text("New Workflow")').click();

    // Modal 打开
    await expect(page.locator('.new-modal')).toBeVisible();

    // 点击取消
    await page.locator('.new-btn-cancel').click();

    // Modal 关闭
    await expect(page.locator('.new-modal')).not.toBeVisible();
  });

  test('ESC 键关闭 Modal', async ({ page }) => {
    await page.locator('button:has-text("New Workflow")').click();

    // Modal 打开
    await expect(page.locator('.new-modal')).toBeVisible();

    // 按 ESC
    await page.keyboard.press('Escape');

    // Modal 关闭
    await expect(page.locator('.new-modal')).not.toBeVisible();
  });
});
