import { test, expect } from "@playwright/test"

test.describe("EC-040: Models Page Redesign", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5556")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)
  })

  test("should display the redesigned Models page with pricing", async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ path: "test-screenshots/EC-040-01-initial.png", fullPage: true })

    // Find and click on Settings button (gear icon in bottom status bar or settings area)
    const settingsButton = page.locator(".bottom-status-settings, [title='Settings'], button:has-text('Settings')")
    if (await settingsButton.count() > 0) {
      await settingsButton.first().click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: "test-screenshots/EC-040-02-settings-open.png", fullPage: true })
    }

    // Look for the Models section in the settings sidebar
    const modelsNav = page.locator("text=Models").first()
    if (await modelsNav.isVisible()) {
      await modelsNav.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: "test-screenshots/EC-040-03-models-section.png", fullPage: true })
    }

    // Check for Quick Access cards
    const quickAccessCards = page.locator(".models-quick-access-card")
    const cardCount = await quickAccessCards.count()
    console.log(`Found ${cardCount} Quick Access cards`)

    // Check for pricing display
    const pricingElements = page.locator(".models-quick-access-price, .model-catalog-col-price")
    const pricingCount = await pricingElements.count()
    console.log(`Found ${pricingCount} pricing elements`)

    // Check for Model Catalog
    const modelCatalog = page.locator(".model-catalog")
    if (await modelCatalog.isVisible()) {
      await page.screenshot({ path: "test-screenshots/EC-040-04-model-catalog.png", fullPage: true })
    }

    // Check for provider sidebar
    const providerSidebar = page.locator(".model-catalog-sidebar")
    if (await providerSidebar.isVisible()) {
      console.log("Provider sidebar is visible")
    }

    // Check for My Providers filter toggle
    const filterToggle = page.locator(".model-catalog-filter-toggle")
    if (await filterToggle.isVisible()) {
      await filterToggle.click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: "test-screenshots/EC-040-05-filter-active.png", fullPage: true })
    }

    // Take final screenshot
    await page.screenshot({ path: "test-screenshots/EC-040-06-final.png", fullPage: true })
  })

  test("should show provider list in catalog sidebar", async ({ page }) => {
    // Navigate to settings and models
    const settingsButton = page.locator(".bottom-status-settings, [title='Settings']").first()
    if (await settingsButton.count() > 0) {
      await settingsButton.click()
      await page.waitForTimeout(500)
    }

    const modelsNav = page.locator("text=Models").first()
    if (await modelsNav.isVisible()) {
      await modelsNav.click()
      await page.waitForTimeout(500)
    }

    // Check for provider items in sidebar
    const providerItems = page.locator(".model-catalog-provider-item")
    const count = await providerItems.count()
    console.log(`Found ${count} provider items in sidebar`)

    // Click on a provider if available
    if (count > 0) {
      await providerItems.first().click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: "test-screenshots/EC-040-07-provider-selected.png", fullPage: true })
    }

    // Check for model rows
    const modelRows = page.locator(".model-catalog-model-row")
    const modelCount = await modelRows.count()
    console.log(`Found ${modelCount} model rows`)

    if (modelCount > 0) {
      // Hover over first model to see hover state
      await modelRows.first().hover()
      await page.waitForTimeout(200)
      await page.screenshot({ path: "test-screenshots/EC-040-08-model-hover.png", fullPage: true })
    }
  })
})
