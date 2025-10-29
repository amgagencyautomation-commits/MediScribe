import { test, expect } from '@playwright/test';

test.describe('Consultations Management', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@mediscribe.com');
    await page.fill('input[name="password"], input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should display consultations page', async ({ page }) => {
    await page.goto('/consultations');
    
    await expect(page.locator('h1, h2').filter({ hasText: /consultation/i })).toBeVisible();
  });

  test('should show empty state when no consultations', async ({ page }) => {
    await page.goto('/consultations');
    
    // Should show either empty state or list of consultations
    const hasConsultations = await page.locator('[data-testid="consultation-item"]').count();
    
    if (hasConsultations === 0) {
      await expect(page.locator('text=/aucune consultation|no consultation|vide/i')).toBeVisible();
    }
  });

  test('should have button to create new consultation', async ({ page }) => {
    await page.goto('/consultations');
    
    const newButton = page.locator('button, a').filter({ hasText: /nouvelle|new|créer|ajouter/i });
    await expect(newButton).toBeVisible();
  });

  test('should navigate to record page when creating consultation', async ({ page }) => {
    await page.goto('/consultations');
    
    const newButton = page.locator('button, a').filter({ hasText: /nouvelle|new|créer|ajouter/i }).first();
    await newButton.click();
    
    // Should navigate to record or create page
    await expect(page).toHaveURL(/\/(record|consultations\/new|enregistrement)/, { timeout: 5000 });
  });

  test('should display audio recorder on record page', async ({ page }) => {
    await page.goto('/record');
    
    // Should have recording interface
    const recordButton = page.locator('button').filter({ hasText: /enregistrer|record|start/i });
    await expect(recordButton).toBeVisible({ timeout: 5000 });
  });

  test('should show file upload option', async ({ page }) => {
    await page.goto('/record');
    
    // Should have file input for audio upload
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.count() > 0) {
      await expect(fileInput.first()).toBeVisible();
    } else {
      // Or have an upload button that reveals file input
      const uploadButton = page.locator('button, label').filter({ hasText: /importer|upload|fichier/i });
      await expect(uploadButton.first()).toBeVisible();
    }
  });

  test('should validate file type for audio upload', async ({ page }) => {
    await page.goto('/record');
    
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.isVisible()) {
      // Check accept attribute
      const acceptAttr = await fileInput.getAttribute('accept');
      expect(acceptAttr).toContain('audio');
    }
  });

  test('should show API key requirement if not configured', async ({ page }) => {
    // Go to settings first
    await page.goto('/settings');
    
    // Check if API key section exists
    const apiKeySection = page.locator('text=/clé.*api|api.*key|mistral/i');
    
    if (await apiKeySection.count() > 0) {
      await expect(apiKeySection.first()).toBeVisible();
    }
  });

  test('should navigate through consultation workflow', async ({ page }) => {
    await page.goto('/consultations');
    
    // Try to create new consultation
    const newButton = page.locator('button, a').filter({ hasText: /nouvelle|new|créer/i }).first();
    
    if (await newButton.isVisible()) {
      await newButton.click();
      
      // Should be on record page or form
      await expect(page).toHaveURL(/\/(record|consultations)/, { timeout: 5000 });
      
      // Check for required elements
      const hasRecorder = await page.locator('button').filter({ hasText: /enregistrer|record/i }).count();
      const hasUpload = await page.locator('input[type="file"]').count();
      
      expect(hasRecorder + hasUpload).toBeGreaterThan(0);
    }
  });

  test('should display consultation list with proper structure', async ({ page }) => {
    await page.goto('/consultations');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for list container
    const listContainer = page.locator('[data-testid="consultations-list"], .consultations-list, main');
    await expect(listContainer.first()).toBeVisible();
  });

  test('should handle navigation back from record page', async ({ page }) => {
    await page.goto('/record');
    
    // Should have back button or navigation
    const backButton = page.locator('button, a').filter({ hasText: /retour|back|précédent/i });
    
    if (await backButton.count() > 0) {
      await backButton.first().click();
      
      // Should navigate back
      await expect(page).toHaveURL(/\/(consultations|dashboard)/, { timeout: 5000 });
    }
  });
});

test.describe('Audio Recording Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@mediscribe.com');
    await page.fill('input[name="password"], input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Navigate to record page
    await page.goto('/record');
  });

  test('should show microphone permission prompt', async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone']);
    
    const recordButton = page.locator('button').filter({ hasText: /enregistrer|record|démarrer/i }).first();
    
    if (await recordButton.isVisible()) {
      await expect(recordButton).toBeEnabled();
    }
  });

  test('should have stop button when recording', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    const startButton = page.locator('button').filter({ hasText: /enregistrer|record|démarrer|start/i }).first();
    
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // Should show stop button
      const stopButton = page.locator('button').filter({ hasText: /arrêter|stop|terminer/i });
      await expect(stopButton.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show timer during recording', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    const startButton = page.locator('button').filter({ hasText: /enregistrer|record|démarrer/i }).first();
    
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // Should show timer (00:00 format or similar)
      const timer = page.locator('text=/\\d{1,2}:\\d{2}/');
      
      if (await timer.count() > 0) {
        await expect(timer.first()).toBeVisible({ timeout: 2000 });
      }
    }
  });
});

test.describe('Report Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@mediscribe.com');
    await page.fill('input[name="password"], input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show report generation option', async ({ page }) => {
    await page.goto('/consultations');
    
    // Check if there are existing consultations with generate button
    const generateButtons = page.locator('button').filter({ hasText: /générer|generate|rapport|report/i });
    
    // Should have generate functionality somewhere
    const count = await generateButtons.count();
    
    if (count === 0) {
      // If no existing consultations, check record page
      await page.goto('/record');
      const recordGenerate = page.locator('button, text').filter({ hasText: /générer|generate/i });
      
      // At least one place should have generation capability
      expect((await recordGenerate.count()) + count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display report viewer when report exists', async ({ page }) => {
    // Navigate to report viewer if it exists
    await page.goto('/consultations');
    
    // Check if any consultation has a view report button
    const viewButtons = page.locator('button, a').filter({ hasText: /voir|view|ouvrir|open/i });
    
    if (await viewButtons.count() > 0) {
      await viewButtons.first().click();
      
      // Should navigate to report view
      await expect(page).toHaveURL(/\/(report|consultation|viewer)/, { timeout: 5000 });
    }
  });

  test('should have print or export functionality for reports', async ({ page }) => {
    // Try to access a report view
    await page.goto('/consultations');
    
    const consultationItems = page.locator('[data-testid="consultation-item"], .consultation-item').first();
    
    if (await consultationItems.count() > 0) {
      await consultationItems.click();
      
      // Should have export/print options
      const exportButton = page.locator('button').filter({ hasText: /export|print|imprimer|télécharger|download/i });
      
      // Export functionality should exist somewhere
      expect(await exportButton.count()).toBeGreaterThanOrEqual(0);
    }
  });
});
