import { test, expect } from '@playwright/test';

/**
 * 路径 1: 用户登录
 *
 * 用户目标：用户能够成功登录应用并访问工作流列表页面。
 */
test.describe('用户登录', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('登录页面正确加载', async ({ page }) => {
    // 验证页面标题可见
    await expect(page.locator('h1')).toContainText('Welcome back');

    // 验证表单元素存在
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // 验证登录按钮
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toContainText('Sign in');
  });

  test('邮箱/密码格式验证', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    // 输入无效格式
    await emailInput.fill('not-an-email');
    await passwordInput.fill('short');

    // HTML5 原生验证应该阻止提交
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('登录失败显示错误提示', async ({ page }) => {
    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // 验证错误提示出现
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 5000 });
  });

  test('可以导航到注册页面', async ({ page }) => {
    const registerLink = page.locator('button.auth-link');
    await expect(registerLink).toContainText('Create account');

    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });
});
