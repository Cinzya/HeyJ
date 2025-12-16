import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Home Screen
 */
export class HomePage {
  readonly page: Page;
  readonly profileIcon: Locator;
  readonly recordingButton: Locator;
  readonly recipientSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    // Profile icon is in the header - look for person icon button
    this.profileIcon = page.locator('button').filter({ has: page.locator('text=/person|account|profile/i') }).first();
    // Fallback: look for any button with person icon (Ionicons)
    if (!this.profileIcon) {
      this.profileIcon = page.locator('[data-testid="profile-button"], button:has-text("person")').first();
    }
    this.recordingButton = page.getByText('HOLD TO SPEAK');
    this.recipientSelector = page.locator('text=/select|recipient/i').first();
  }

  /**
   * Wait for home screen to load
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for conversations to load
    await this.page.waitForTimeout(2000);
  }

  /**
   * Open profile modal by clicking profile icon
   */
  async openProfile(): Promise<void> {
    // Try multiple selectors for the profile icon
    const selectors = [
      'button:has([class*="person"])',
      'button:has([class*="profile"])',
      '[aria-label*="profile" i]',
      'button:has-text("person")',
    ];

    let clicked = false;
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      // Fallback: click on header right area
      const headerRight = this.page.locator('header').locator('button').last();
      if (await headerRight.isVisible()) {
        await headerRight.click();
      }
    }

    await this.page.waitForTimeout(1000); // Wait for modal to open
  }

  /**
   * Get user code from profile modal
   * This assumes the profile modal is open
   */
  async getUserCode(): Promise<string | null> {
    // Look for user code in the format Name@1234
    const userCodeText = await this.page.locator('text=/\\w+@\\d{4}/').first().textContent();
    if (userCodeText) {
      const match = userCodeText.match(/(\w+@\d{4})/);
      return match ? match[1] : null;
    }
    return null;
  }

  /**
   * Open Add Friend modal
   * Assumes profile modal is already open
   */
  async openAddFriendModal(): Promise<void> {
    // Look for "Add Friend" button in the profile modal
    const addFriendButton = this.page.getByText(/add friend/i).first();
    await addFriendButton.click();
    await this.page.waitForTimeout(1000); // Wait for modal to open
  }

  /**
   * Select a friend from recipient dropdown
   */
  async selectFriend(friendName: string): Promise<void> {
    // Click on recipient selector
    const selector = this.page.locator('text=/select|recipient/i').first();
    if (await selector.isVisible()) {
      await selector.click();
      await this.page.waitForTimeout(500);
    }

    // Select friend from dropdown
    const friendOption = this.page.getByText(friendName).first();
    await friendOption.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if home screen is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      // React Native Web renders text directly, check for the text content
      const isVisible = await this.recordingButton.isVisible({ timeout: 5000 });
      if (!isVisible) {
        // Fallback: check if we're not on login screen
        const loginInput = this.page.getByPlaceholder('Email');
        const isLoginVisible = await loginInput.isVisible({ timeout: 1000 }).catch(() => false);
        return !isLoginVisible;
      }
      return isVisible;
    } catch (e) {
      return false;
    }
  }

  /**
   * Logout by opening profile and clicking sign out
   */
  async logout(): Promise<void> {
    // Open profile modal
    await this.openProfile();
    
    // Wait for profile modal to be visible
    await this.page.waitForTimeout(1000);
    
    // Look for "Sign Out" button in the profile modal
    const signOutButton = this.page.getByText(/sign out/i).first();
    await signOutButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Click sign out
    await signOutButton.click();
    
    // Wait for logout to complete and navigation to login screen
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle');
  }
}
