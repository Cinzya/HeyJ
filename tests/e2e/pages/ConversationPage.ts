import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Conversation Screen
 */
export class ConversationPage {
  readonly page: Page;
  readonly recordingButton: Locator;
  readonly messagesList: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.recordingButton = page.getByText('HOLD TO SPEAK');
    this.messagesList = page.locator('[data-testid="message-list"], [class*="FlatList"]').first();
    this.backButton = page.locator('button:has([class*="arrow-back"]), [aria-label*="back" i]').first();
  }

  /**
   * Navigate to conversation screen
   */
  async goto(conversationId?: string): Promise<void> {
    // This would typically be navigated to from the conversations list
    // For now, we'll assume navigation happens via clicking a conversation item
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Send a message by simulating recording
   */
  async sendMessage(durationMs: number = 2000): Promise<void> {
    // Press and hold the recording button
    await this.recordingButton.press('MouseDown');
    await this.page.waitForTimeout(durationMs);
    await this.recordingButton.press('MouseUp');
    
    // Wait for message to be uploaded and appear
    await this.page.waitForTimeout(3000);
  }

  /**
   * Wait for a message to appear in the conversation
   */
  async waitForMessage(timeout: number = 30000): Promise<void> {
    // Wait for message list to update
    // In React Native Web, messages might appear in a FlatList or ScrollView
    await this.page.waitForTimeout(2000);
    
    // Look for message indicators (waveform, play button, etc.)
    const messageIndicator = this.page.locator('[class*="message"], [class*="recording"]').first();
    await messageIndicator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Get all messages in the conversation
   */
  async getMessages(): Promise<string[]> {
    // Extract message elements - this is simplified
    // In reality, you'd need to inspect the actual DOM structure
    const messageElements = await this.page.locator('[class*="message"]').all();
    const messages: string[] = [];
    
    for (const element of messageElements) {
      const text = await element.textContent();
      if (text) {
        messages.push(text);
      }
    }
    
    return messages;
  }

  /**
   * Navigate back to home
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if conversation screen is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.recordingButton.isVisible({ timeout: 5000 });
  }
}
