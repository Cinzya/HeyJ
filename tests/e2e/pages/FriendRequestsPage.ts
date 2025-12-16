import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Friend Requests Screen
 */
export class FriendRequestsPage {
  readonly page: Page;
  readonly backButton: Locator;
  readonly incomingSection: Locator;
  readonly outgoingSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backButton = page.locator('button:has([class*="arrow-back"]), [aria-label*="back" i]').first();
    this.incomingSection = page.locator('text=/incoming/i').first();
    this.outgoingSection = page.locator('text=/outgoing/i').first();
  }

  /**
   * Navigate to friend requests screen
   * This is typically accessed via navigation or badge
   */
  async goto(): Promise<void> {
    // Look for friend requests badge or navigation item
    const badge = this.page.locator('text=/friend.*request/i').first();
    if (await badge.isVisible({ timeout: 5000 })) {
      await badge.click();
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for a friend request to appear
   */
  async waitForRequest(userName: string, timeout: number = 30000): Promise<void> {
    await this.page.waitForSelector(`text="${userName}"`, { timeout });
  }

  /**
   * Accept a friend request by user name
   */
  async acceptRequest(userName: string): Promise<void> {
    // Find the request item containing the user name
    const requestItem = this.page.locator(`text="${userName}"`).locator('..').locator('..');
    
    // Look for accept button near the user name
    const acceptButton = this.page
      .locator(`text="${userName}"`)
      .locator('..')
      .locator('..')
      .getByRole('button', { name: /accept/i })
      .first();
    
    await acceptButton.click();
    await this.page.waitForTimeout(2000); // Wait for request to be processed
  }

  /**
   * Reject a friend request by user name
   */
  async rejectRequest(userName: string): Promise<void> {
    const rejectButton = this.page
      .locator(`text="${userName}"`)
      .locator('..')
      .locator('..')
      .getByRole('button', { name: /reject/i })
      .first();
    
    await rejectButton.click();
    // Handle confirmation dialog if present
    await this.page.waitForTimeout(1000);
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|ok/i }).first();
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }
    await this.page.waitForTimeout(2000);
  }

  /**
   * Navigate back
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if friend requests screen is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.page.getByText(/friend.*request/i).first().isVisible({ timeout: 5000 });
  }
}
