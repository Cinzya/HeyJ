import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Signup Screen
 */
export class SignupPage {
  readonly page: Page;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly createAccountButton: Locator;
  readonly backToLoginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fullNameInput = page.getByPlaceholder('Full Name');
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.confirmPasswordInput = page.getByPlaceholder('Confirm Password');
    // React Native Web uses divs, not buttons
    this.createAccountButton = page.locator('text=/create account/i').first();
    this.backToLoginLink = page.getByText(/already have an account/i);
  }

  /**
   * Navigate to signup page
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    // Navigate to signup if not already there
    const loginLink = this.page.getByText(/don't have an account/i);
    if (await loginLink.isVisible()) {
      await loginLink.click();
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill the signup form
   */
  async fillForm(fullName: string, email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.fullNameInput.fill(fullName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
    await this.page.waitForTimeout(500); // Wait for form validation
  }

  /**
   * Submit the signup form
   */
  async signup(fullName: string, email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.fillForm(fullName, email, password, confirmPassword);
    await this.createAccountButton.click();
    // Wait for signup to complete
    await this.page.waitForTimeout(3000); // Wait for account creation and auth state change
  }

  /**
   * Navigate back to login
   */
  async navigateToLogin(): Promise<void> {
    await this.backToLoginLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if signup page is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.fullNameInput.isVisible();
  }
}
