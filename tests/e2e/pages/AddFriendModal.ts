import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Add Friend Modal
 */
export class AddFriendModal {
  readonly page: Page;
  readonly friendCodeInput: Locator;
  readonly addButton: Locator;
  readonly cancelButton: Locator;
  readonly userCodeDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.friendCodeInput = page.getByPlaceholder(/e\.g\.,|friend code/i);
    // React Native Web uses divs, not buttons
    this.addButton = page.locator('text=/^add$/i').first();
    this.cancelButton = page.locator('text=/cancel/i').first();
    this.userCodeDisplay = page.locator('text=/\\w+@\\d{4}/').first();
  }

  /**
   * Wait for modal to be visible
   */
  async waitForModal(): Promise<void> {
    await this.friendCodeInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Enter friend code
   */
  async enterFriendCode(code: string): Promise<void> {
    await this.friendCodeInput.fill(code);
    await this.page.waitForTimeout(300);
  }

  /**
   * Submit friend request
   */
  async submit(): Promise<void> {
    await this.addButton.click();
    // Wait for success alert or error
    await this.page.waitForTimeout(2000);
  }

  /**
   * Cancel and close modal
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get user code displayed in modal
   */
  async getUserCode(): Promise<string | null> {
    const text = await this.userCodeDisplay.textContent();
    if (text) {
      const match = text.match(/(\w+@\d{4})/);
      return match ? match[1] : null;
    }
    return null;
  }

  /**
   * Check if modal is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.friendCodeInput.isVisible({ timeout: 5000 });
  }
}
