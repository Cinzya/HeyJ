import { Page } from '@playwright/test';

/**
 * General test helper utilities
 */

/**
 * Wait for React Navigation to complete
 * This waits for the page to be in a stable state
 */
export async function waitForNavigation(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Additional wait for React state updates
}

/**
 * Extract userCode from UI text
 * Format: Name@1234
 */
export function extractUserCode(text: string): string | null {
  const match = text.match(/(\w+@\d{4})/);
  return match ? match[1] : null;
}

/**
 * Generate a minimal valid MP3 file blob for testing
 * This creates a very short silent MP3 file
 */
export function generateTestAudio(): Blob {
  // Minimal MP3 header + silent frame (very simplified)
  // In a real scenario, you'd want a proper MP3 encoder or use a pre-generated file
  const mp3Header = new Uint8Array([
    0xFF, 0xFB, 0x90, 0x00, // MP3 sync word + header
    // ... minimal silent frame data
  ]);

  // For testing, we'll create a minimal audio blob
  // In practice, you might want to use a real audio file or proper encoder
  return new Blob([mp3Header], { type: 'audio/mpeg' });
}

/**
 * Wait for an element to appear with retries
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: { timeout?: number; state?: 'visible' | 'attached' }
): Promise<void> {
  await page.waitForSelector(selector, {
    timeout: options?.timeout || 10000,
    state: options?.state || 'visible',
  });
}

/**
 * Wait for text to appear on the page
 */
export async function waitForText(
  page: Page,
  text: string,
  timeout?: number
): Promise<void> {
  await page.waitForSelector(`text="${text}"`, { timeout: timeout || 10000 });
}

/**
 * Click and wait for navigation
 */
export async function clickAndWaitForNavigation(
  page: Page,
  selector: string
): Promise<void> {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click(selector),
  ]);
}

/**
 * Fill input and wait for it to be updated
 */
export async function fillInput(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await page.fill(selector, value);
  await page.waitForTimeout(200); // Wait for React state update
}

/**
 * Wait for Supabase API call to complete
 */
export async function waitForSupabaseCall(
  page: Page,
  endpoint: string,
  timeout?: number
): Promise<void> {
  await page.waitForResponse(
    (response) => response.url().includes(endpoint),
    { timeout: timeout || 30000 }
  );
}

/**
 * Wait for alert dialog and get its message
 */
export async function waitForAlert(
  page: Page,
  timeout?: number
): Promise<string> {
  // Playwright handles dialogs automatically, but we can wait for them
  let alertMessage = '';
  
  page.once('dialog', async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });

  await page.waitForTimeout(timeout || 5000);
  return alertMessage;
}

/**
 * Generate a timestamp for unique test data
 */
export function generateTimestamp(): number {
  return Date.now();
}
