import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import {
  generateTestEmail,
  generateTestUserName,
  createTestUser,
  deleteTestUser,
} from './utils/user-manager';
import { TEST_USER_PASSWORD, CLEANUP_TEST_DATA } from './config/test-config';
import { generateTimestamp } from './utils/test-helpers';

/**
 * Test login and logout flow
 */
test.describe('Login and Logout Flow', () => {
  let testEmail: string;
  let testName: string;
  let userId: string | null = null;
  const timestamp = generateTimestamp();

  test.beforeAll(async () => {
    testEmail = generateTestEmail(1, timestamp);
    testName = generateTestUserName(1);
  });

  test.afterAll(async () => {
    if (CLEANUP_TEST_DATA && testEmail) {
      if (userId) {
        await deleteTestUser(testEmail);
      }
    }
  });

  test('Login and then logout', async ({ page }) => {
    // Step 1: Create test user account
    const result = await createTestUser(testEmail, TEST_USER_PASSWORD, testName);
    userId = result.userId;
    expect(userId).toBeTruthy();

    // Step 2: Navigate to login page
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Verify we're on login page
    const isLoginVisible = await loginPage.isVisible();
    expect(isLoginVisible).toBe(true);

    // Step 3: Login
    await loginPage.login(testEmail, TEST_USER_PASSWORD);
    
    // Step 4: Verify we're logged in (on home screen)
    const homePage = new HomePage(page);
    await homePage.waitForLoad();
    
    const isHomeVisible = await homePage.isVisible();
    expect(isHomeVisible).toBe(true);
    
    // Additional verification: check that login elements are NOT visible
    const emailInput = page.getByPlaceholder('Email');
    const isLoginInputVisible = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isLoginInputVisible).toBe(false);

    // Step 5: Logout
    await homePage.logout();
    
    // Step 6: Verify we're logged out (back on login screen)
    const loginPageAfterLogout = new LoginPage(page);
    const isLoginVisibleAfterLogout = await loginPageAfterLogout.isVisible();
    expect(isLoginVisibleAfterLogout).toBe(true);
    
    // Verify home screen elements are NOT visible
    const recordingButton = page.getByText('HOLD TO SPEAK');
    const isRecordingButtonVisible = await recordingButton.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isRecordingButtonVisible).toBe(false);
    
    // Verify login form is visible
    const emailInputAfterLogout = page.getByPlaceholder('Email');
    const passwordInputAfterLogout = page.getByPlaceholder('Password');
    await expect(emailInputAfterLogout).toBeVisible();
    await expect(passwordInputAfterLogout).toBeVisible();
  });

  test('Login with invalid credentials should fail', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Try to login with invalid credentials
    await loginPage.emailInput.fill('invalid@example.com');
    await loginPage.passwordInput.fill('wrongpassword');
    await loginPage.signInButton.click();
    
    // Wait for error message or alert
    await page.waitForTimeout(2000);
    
    // Should still be on login page (not redirected to home)
    const isLoginVisible = await loginPage.isVisible();
    expect(isLoginVisible).toBe(true);
    
    // Verify we're NOT on home screen
    const homePage = new HomePage(page);
    const isHomeVisible = await homePage.isVisible();
    expect(isHomeVisible).toBe(false);
  });

  test('Login, logout, then login again', async ({ page }) => {
    // Create user if not already created
    if (!userId) {
      const result = await createTestUser(testEmail, TEST_USER_PASSWORD, testName);
      userId = result.userId;
    }

    // First login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testEmail, TEST_USER_PASSWORD);
    
    // Verify logged in
    const homePage = new HomePage(page);
    await homePage.waitForLoad();
    expect(await homePage.isVisible()).toBe(true);
    
    // Logout
    await homePage.logout();
    
    // Verify logged out
    expect(await loginPage.isVisible()).toBe(true);
    
    // Login again
    await loginPage.login(testEmail, TEST_USER_PASSWORD);
    
    // Verify logged in again
    await homePage.waitForLoad();
    expect(await homePage.isVisible()).toBe(true);
  });
});
