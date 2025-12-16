import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Login Screen
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly signUpLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    // React Native Web uses divs, not buttons - use text content instead
    this.signInButton = page.locator('text=/sign in/i').first();
    this.signUpLink = page.getByText(/don't have an account/i);
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
    // Wait for navigation after login
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); // Wait for auth state change
  }

  /**
   * Navigate to signup page
   */
  async navigateToSignup(): Promise<void> {
    await this.signUpLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if login page is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.emailInput.isVisible();
  }
}
