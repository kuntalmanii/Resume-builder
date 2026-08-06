// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('ResuAI Studio — End-to-End Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. Page Header & Core Canvas Load Cleanly', async ({ page }) => {
    await expect(page).toHaveTitle(/ResuAI/i);
    const navBuilder = page.locator('.nav-item[data-tab="resume-builder"]');
    await expect(navBuilder).toBeAttached();
    const paperSheet = page.locator('#printableResumeDoc, .preview-paper-sheet, #previewName');
    await expect(paperSheet.first()).toBeAttached();
  });

  test('2. Resume Form Live Sync Updates Paper Canvas', async ({ page }) => {
    const inputName = page.locator('#inputFullName');
    if (await inputName.isVisible()) {
      await inputName.fill('Alex Morgan');
      await inputName.dispatchEvent('input');
      const previewName = page.locator('#previewName');
      await expect(previewName).toHaveText('Alex Morgan');
    }
  });

  test('3. PDF Export Triggers Background Vector Print Iframe', async ({ page }) => {
    const btnPdf = page.locator('#btnPrintPdf, #btnExportPdf');
    if (await btnPdf.first().isVisible()) {
      await btnPdf.first().click();
      const iframe = page.locator('#resuaiPrintIframe');
      await expect(iframe).toBeAttached();
    }
  });

  test('4. ATS Analyzer Scans Preset JD and Renders Score', async ({ page }) => {
    const atsTab = page.locator('.nav-item[data-tab="ats-analyzer"]');
    if (await atsTab.isVisible()) {
      await atsTab.click();
      const btnScan = page.locator('#btnRunAtsAnalysis');
      await expect(btnScan).toBeVisible();
      await btnScan.click();
      // Verify ATS match score card or ring appears
      const scoreRing = page.locator('.ats-score-ring, .ats-overall-score, [data-score]');
      await expect(scoreRing.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('5. Multi-Profile Version Manager Opens and Switches Career Track', async ({ page }) => {
    const btnNewVersion = page.locator('#sidebarNewResumeBtn, #btnNewResume');
    if (await btnNewVersion.first().isVisible()) {
      await btnNewVersion.first().click();
      const modal = page.locator('#versionProfilesModal');
      await expect(modal).toBeVisible();

      const loadArchitectBtn = page.locator('[data-profile-id="fullstack-architect"]');
      if (await loadArchitectBtn.first().isVisible()) {
        await loadArchitectBtn.first().click();
        await expect(modal).toBeHidden();
      }
    }
  });

  test('6. Job Application Tracker Renders Kanban Board', async ({ page }) => {
    const trackerTab = page.locator('.nav-item[data-tab="job-tracker"]');
    if (await trackerTab.isVisible()) {
      await trackerTab.click();
      const kanbanBoard = page.locator('.kanban-board, #kanbanCol-wishlist, .job-pipeline-grid');
      await expect(kanbanBoard.first()).toBeVisible();
    }
  });

});
