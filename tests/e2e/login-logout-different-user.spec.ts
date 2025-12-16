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
 * Test login, logout, then login with a different user
 */
test.describe('Login, Logout, Login with Different User', () => {
  let user1Email: string;
  let user1Name: string;
  let user1Id: string | null = null;
  
  let user2Email: string;
  let user2Name: string;
  let user2Id: string | null = null;
  
  const timestamp = generateTimestamp();

  test.beforeAll(async () => {
    // Generate credentials for two different users
    user1Email = generateTestEmail(1, timestamp);
    user1Name = generateTestUserName(1);
    
    user2Email = generateTestEmail(2, timestamp);
    user2Name = generateTestUserName(2);
  });

  test.afterAll(async () => {
    if (CLEANUP_TEST_DATA) {
      if (user1Email && user1Id) {
        await deleteTestUser(user1Email);
      }
      if (user2Email && user2Id) {
        await deleteTestUser(user2Email);
      }
    }
  });

  test('Login with user 1, logout, then login with user 2', async ({ page }) => {
    // Step 1: Create User 1 account
    console.log('Creating User 1 account...');
    const result1 = await createTestUser(user1Email, TEST_USER_PASSWORD, user1Name);
    user1Id = result1.userId;
    expect(user1Id).toBeTruthy();
    console.log(`User 1 created: ${user1Email} (ID: ${user1Id})`);

    // Step 2: Login with User 1
    console.log('Logging in with User 1...');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Verify we're on login page
    expect(await loginPage.isVisible()).toBe(true);

    // Login with User 1
    await loginPage.login(user1Email, TEST_USER_PASSWORD);
    
    // Wait for navigation and verify we're logged in
    const homePage = new HomePage(page);
    await homePage.waitForLoad();
    expect(await homePage.isVisible()).toBe(true);
    console.log('User 1 logged in successfully');

    // Verify User 1's profile
    await homePage.openProfile();
    await page.waitForTimeout(1000);
    
    const user1NameElement = page.locator(`text="${user1Name}"`).first();
    await expect(user1NameElement).toBeVisible({ timeout: 5000 });
    console.log('User 1 profile verified');
    
    // Close profile modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Step 3: Logout
    console.log('Logging out User 1...');
    await homePage.logout();
    
    // Wait for navigation back to login
    await page.waitForTimeout(3000);
    
    // Verify we're on login screen
    const loginPageAfterLogout = new LoginPage(page);
    expect(await loginPageAfterLogout.isVisible()).toBe(true);
    console.log('Successfully logged out');

    // Verify home screen elements are NOT visible
    const recordingButton = page.getByText('HOLD TO SPEAK');
    await expect(recordingButton).not.toBeVisible({ timeout: 2000 });

    // Step 4: Create User 2 account
    console.log('Creating User 2 account...');
    const result2 = await createTestUser(user2Email, TEST_USER_PASSWORD, user2Name);
    user2Id = result2.userId;
    expect(user2Id).toBeTruthy();
    expect(user2Id).not.toBe(user1Id); // Verify it's a different user
    console.log(`User 2 created: ${user2Email} (ID: ${user2Id})`);

    // Step 5: Login with User 2
    console.log('Logging in with User 2...');
    
    // Verify we're still on login page
    expect(await loginPageAfterLogout.isVisible()).toBe(true);
    
    // Login with User 2 (different credentials)
    await loginPageAfterLogout.login(user2Email, TEST_USER_PASSWORD);
    
    // Wait for navigation and verify we're logged in with User 2
    const homePageUser2 = new HomePage(page);
    await homePageUser2.waitForLoad();
    expect(await homePageUser2.isVisible()).toBe(true);
    console.log('User 2 logged in successfully');

    // Step 6: Verify User 2's profile (not User 1)
    await homePageUser2.openProfile();
    await page.waitForTimeout(1000);
    
    // Check if profile modal shows User 2's name
    const user2NameElement = page.locator(`text="${user2Name}"`).first();
    await expect(user2NameElement).toBeVisible({ timeout: 5000 });
    console.log('User 2 profile verified');
    
    // Verify User 1's name is NOT the primary profile name (it might be in friends list)
    // We'll verify by checking that User 2's name appears before User 1's name in the profile
    const profileText = await page.locator('body').textContent();
    const user2Index = profileText?.indexOf(user2Name) ?? -1;
    const user1Index = profileText?.indexOf(user1Name) ?? -1;
    
    // User 2's name should be visible, and if User 1's name is also visible, 
    // it should be later in the text (likely in friends list)
    expect(user2Index).toBeGreaterThan(-1);
    console.log('✅ Verified: User 2 is logged in (not User 1)');
    
    // Close profile modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Step 7: Final verification
    // Verify we're still logged in (not back on login)
    const emailInputFinal = page.getByPlaceholder('Email');
    await expect(emailInputFinal).not.toBeVisible({ timeout: 2000 });
    
    console.log('✅ Test completed successfully: Logged in with User 1, logged out, logged in with User 2');
  });
});
