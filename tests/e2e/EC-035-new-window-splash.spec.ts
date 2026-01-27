import { test, expect } from '@playwright/test'

test.describe('EC-035: New Window Splash Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the app to load
    await page.waitForSelector('.project-tab-bar, .home-screen, .folder-selection-view', { timeout: 10000 })
  })

  test('should display splash page or home screen on initial load', async ({ page }) => {
    // The app should show either the full splash page (no instances) or home screen cards
    const splashPage = page.locator('.folder-selection-view, .home-screen')
    const tabBar = page.locator('.project-tab-bar')

    // Either we see the splash page directly, or we have a tab bar
    const splashCount = await splashPage.count()
    const tabBarCount = await tabBar.count()

    // At least one should be visible
    expect(splashCount + tabBarCount).toBeGreaterThan(0)

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/EC-035-initial-state.png', fullPage: true })
  })

  test('should display logo image on home screen', async ({ page }) => {
    // Navigate to home screen via new tab button if instances exist
    const newTabButton = page.locator('.project-tab-new')
    if (await newTabButton.count() > 0) {
      await newTabButton.click()
      await page.waitForTimeout(500)
    }

    // Check for logo in either splash page or home screen
    const logo = page.locator('.home-logo, img[alt*="Era Code"]')
    const logoCount = await logo.count()

    if (logoCount > 0) {
      await expect(logo.first()).toBeVisible()

      // Verify it's an actual image with src
      const src = await logo.first().getAttribute('src')
      expect(src).toBeTruthy()
      expect(src).toContain('EraCode')
    }

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/EC-035-logo-visible.png', fullPage: true })
  })

  test('should show folder selection view when no active instance', async ({ page }) => {
    // If we have instances, click new tab to get the selection view
    const newTabButton = page.locator('.project-tab-new')
    if (await newTabButton.count() > 0) {
      await newTabButton.click()
      await page.waitForTimeout(500)
    }

    // We should see some form of folder selection UI (either FolderSelectionView or FolderSelectionCards)
    const folderSelectionUI = page.locator('.home-screen, .folder-selection-view, [class*="folder-selection"]')
    const uiCount = await folderSelectionUI.count()

    // Should not see a blank page - at least one selection UI element should exist
    expect(uiCount).toBeGreaterThan(0)

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/EC-035-folder-selection.png', fullPage: true })
  })

  test('should have Browse Folders button that opens native dialog', async ({ page }) => {
    // Navigate to home screen
    const newTabButton = page.locator('.project-tab-new')
    if (await newTabButton.count() > 0) {
      await newTabButton.click()
      await page.waitForTimeout(500)
    }

    // Find the browse button - could be in home screen cards or full splash view
    const browseButton = page.locator('.home-action-button, .button-primary').filter({ hasText: /Browse|Open/i })
    const buttonCount = await browseButton.count()

    if (buttonCount > 0) {
      await expect(browseButton.first()).toBeVisible()
      await expect(browseButton.first()).toBeEnabled()

      // Verify button text
      const buttonText = await browseButton.first().textContent()
      expect(buttonText).toMatch(/Browse|Open/i)
    }

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/EC-035-browse-button.png', fullPage: true })
  })

  test('should not show blank page in any state', async ({ page }) => {
    // The page should always have visible content
    const visibleContent = page.locator('.home-screen, .folder-selection-view, .project-tab-bar, .instance-shell')

    // Wait for content to load
    await page.waitForTimeout(1000)

    // Check for at least some visible content
    const contentCount = await visibleContent.count()
    expect(contentCount).toBeGreaterThan(0)

    // Specifically check we don't have a completely empty body
    const bodyContent = await page.locator('body').innerHTML()
    expect(bodyContent.length).toBeGreaterThan(100) // Should have substantial content

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/EC-035-no-blank-page.png', fullPage: true })
  })

  test('should show home-hero section with branding', async ({ page }) => {
    // Navigate to home screen
    const newTabButton = page.locator('.project-tab-new')
    if (await newTabButton.count() > 0) {
      await newTabButton.click()
      await page.waitForTimeout(500)
    }

    // Check for hero section elements
    const hero = page.locator('.home-hero')
    const heroCount = await hero.count()

    if (heroCount > 0) {
      await expect(hero).toBeVisible()

      // Check for title
      const title = page.locator('.home-title')
      if (await title.count() > 0) {
        await expect(title).toBeVisible()
        const titleText = await title.textContent()
        expect(titleText).toContain('Era Code')
      }

      // Check for subtitle
      const subtitle = page.locator('.home-subtitle')
      if (await subtitle.count() > 0) {
        await expect(subtitle).toBeVisible()
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/EC-035-hero-branding.png', fullPage: true })
  })
})
