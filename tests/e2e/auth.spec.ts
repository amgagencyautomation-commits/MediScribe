import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testEmail = `test${Date.now()}@mediscribe.com`;
  const testPassword = 'Test123456!';

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('h1, h2').filter({ hasText: /connexion|login/i })).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"], input[type="email"]', 'wrong@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/incorrect|invalide|erreur/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display signup page', async ({ page }) => {
    await page.goto('/signup');
    
    await expect(page.locator('h1, h2').filter({ hasText: /inscription|sign.*up|créer.*compte/i })).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
  });

  test('should validate email format on signup', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="email"], input[type="email"]', 'invalid-email');
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // HTML5 validation or custom error should appear
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', '123'); // Weak password
    
    await page.click('button[type="submit"]');
    
    // Should show password strength error
    await expect(page.locator('text=/mot de passe|password|caractères/i')).toBeVisible({ timeout: 3000 });
  });

  test('should successfully create account and redirect to dashboard', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill signup form
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    
    // Select specialty if present
    const specialtySelect = page.locator('select[name="specialty"]');
    if (await specialtySelect.isVisible()) {
      await specialtySelect.selectOption({ index: 1 });
    }
    
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or onboarding
    await expect(page).toHaveURL(/\/(dashboard|onboarding|settings)/, { timeout: 10000 });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Note: This assumes the account from previous test exists
    // In real scenarios, you'd use a test database with pre-seeded data
    
    await page.goto('/login');
    
    await page.fill('input[name="email"], input[type="email"]', 'test@mediscribe.com');
    await page.fill('input[name="password"], input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Should see user-specific content
    await expect(page.locator('text=/bienvenue|dashboard|tableau de bord/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@mediscribe.com');
    await page.fill('input[name="password"], input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Find and click logout button
    const logoutButton = page.locator('button, a').filter({ hasText: /déconnexion|logout|sign.*out/i });
    await logoutButton.click();
    
    // Should redirect to login or home
    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 5000 });
  });

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    // Clear cookies to ensure logged out state
    await page.context().clearCookies();
    
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should remember user session after page refresh', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@mediscribe.com');
    await page.fill('input[name="password"], input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Refresh page
    await page.reload();
    
    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
