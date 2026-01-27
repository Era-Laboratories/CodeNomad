import { test, expect } from "@playwright/test"

test.describe("UI Screenshots", () => {
  test("capture governance UI flow", async ({ page }) => {
    // Navigate to the app
    await page.goto("http://localhost:3000")
    await page.waitForTimeout(2000)

    // Screenshot: Folder selection
    await page.screenshot({ path: "test-screenshots/01-folder-selection.png", fullPage: true })

    // Click on CodeNomad folder
    const folderItem = page.locator('text=CodeNomad').first()
    if (await folderItem.count() > 0) {
      await folderItem.click()
      await page.waitForTimeout(4000)

      // Screenshot: Main view after opening project
      await page.screenshot({ path: "test-screenshots/02-main-view.png", fullPage: true })

      // Press Cmd+, to open settings
      await page.keyboard.press('Meta+,')
      await page.waitForTimeout(1000)

      // Screenshot: Settings panel
      await page.screenshot({ path: "test-screenshots/03-settings-panel.png", fullPage: true })

      // Look for the "View Governance Rules" button and click it
      const governanceBtn = page.locator('text=View Governance Rules')
      if (await governanceBtn.count() > 0) {
        await governanceBtn.click()
        await page.waitForTimeout(1000)

        // Screenshot: Governance panel
        await page.screenshot({ path: "test-screenshots/04-governance-panel.png", fullPage: true })
      }
    }
  })
})
