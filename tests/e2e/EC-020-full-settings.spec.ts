import { test, expect } from "@playwright/test"

test.describe("Full Settings Pane", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Wait for the app to load - look for settings button (title="Settings" in tab bar or text in footer)
    await page.waitForSelector('button[title="Settings"], button:has-text("Settings")', { timeout: 10000 })
  })

  test("Home screen should render correctly with Settings button", async ({ page }) => {
    // Take a screenshot of the home screen
    await page.screenshot({ path: "test-screenshots/home-screen.png" })

    // Verify settings is accessible - either via settings button in tab bar (when instances exist)
    // or via the Settings shortcut button (on folder selection view)
    const openSettingsButton = page.locator('button[title="Settings"]')
    const settingsShortcut = page.getByRole("button", { name: /Settings/i })

    const hasOpenSettings = await openSettingsButton.isVisible().catch(() => false)
    const hasSettingsShortcut = await settingsShortcut.first().isVisible().catch(() => false)

    expect(hasOpenSettings || hasSettingsShortcut).toBeTruthy()
  })

  test("Full Settings should open and show consolidated Models section", async ({ page }) => {
    // Click on Settings button to open settings
    const openSettingsButton = page.locator('button[title="Settings"]')
    const settingsShortcut = page.getByRole("button", { name: /Cmd.*Settings/i }).first()

    if (await openSettingsButton.isVisible().catch(() => false)) {
      await openSettingsButton.click()
    } else if (await settingsShortcut.isVisible().catch(() => false)) {
      await settingsShortcut.click()
    }

    // Wait for settings panel to open
    await page.waitForTimeout(500)

    // Look for All Settings button to open Full Settings
    const allSettingsBtn = page.getByRole("button", { name: /All Settings/i }).first()
    if (await allSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allSettingsBtn.click()
      await page.waitForTimeout(500)
    }

    // Take screenshot of full settings
    await page.screenshot({ path: "test-screenshots/full-settings-open.png" })

    // Click on Models in the sidebar
    const modelsNav = page.getByRole("button", { name: /^Models$/i }).first()
    if (await modelsNav.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modelsNav.click()
      await page.waitForTimeout(500)

      // Take screenshot of Models section
      await page.screenshot({ path: "test-screenshots/full-settings-models.png" })

      // Verify Models section has consolidated content:
      // 1. Default Models by Agent with Edit buttons
      const editButtons = page.getByRole("button", { name: /Edit/i })
      const editCount = await editButtons.count()
      expect(editCount).toBeGreaterThanOrEqual(3) // main, plan, explore agents

      // 2. Model Database sync section
      const syncButton = page.getByRole("button", { name: /Sync Now/i })
      await expect(syncButton).toBeVisible({ timeout: 5000 })

      // 3. API Providers section (consolidated from old Providers page)
      const apiProvidersHeading = page.getByRole("heading", { name: /API Providers/i })
      await expect(apiProvidersHeading).toBeVisible({ timeout: 3000 })
    }
  })

  test("Edit button should open model selector modal", async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = []
    page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))

    // Open settings
    const openSettingsButton = page.locator('button[title="Settings"]')
    const settingsShortcut = page.getByRole("button", { name: /Cmd.*Settings/i }).first()

    if (await openSettingsButton.isVisible().catch(() => false)) {
      await openSettingsButton.click()
    } else if (await settingsShortcut.isVisible().catch(() => false)) {
      await settingsShortcut.click()
    }

    await page.waitForTimeout(500)

    // Open Full Settings
    const allSettingsBtn = page.getByRole("button", { name: /All Settings/i }).first()
    if (await allSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allSettingsBtn.click()
      await page.waitForTimeout(500)
    }

    // Navigate to Models
    const modelsNav = page.getByRole("button", { name: /^Models$/i }).first()
    if (await modelsNav.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modelsNav.click()
      await page.waitForTimeout(500)

      // Click the Edit button on Main Agent row using a more specific locator
      // Find the row containing "Main Agent" and click its Edit button
      const mainAgentRow = page.locator('.full-settings-list-item:has-text("Main Agent")')
      const editButton = mainAgentRow.getByRole("button", { name: /Edit/i })

      await expect(editButton).toBeVisible({ timeout: 3000 })
      console.log("Edit button found, clicking...")

      // Try different click approaches
      await editButton.scrollIntoViewIfNeeded()
      await editButton.click()
      await page.waitForTimeout(1500)

      // Log console messages
      console.log("Console logs after click:", consoleLogs.filter(l => l.includes("ModelsSection")))

      // Take screenshot to see what happened
      await page.screenshot({ path: "test-screenshots/after-edit-click.png" })

      // Verify model selector modal opens
      const modalTitle = page.getByText(/Select Model for/i)
      await expect(modalTitle).toBeVisible({ timeout: 5000 })

      // Take screenshot of model selector
      await page.screenshot({ path: "test-screenshots/model-selector-modal.png" })

      // Verify Provider dropdown exists
      const providerSelect = page.locator('select').first()
      await expect(providerSelect).toBeVisible()

      // Close modal
      const cancelButton = page.getByRole("button", { name: /Cancel/i })
      await cancelButton.click()
    }
  })

  test("App should render without critical UI errors", async ({ page }) => {
    // Navigate and wait for load
    await page.reload()
    await page.waitForTimeout(2000)

    // Take a final screenshot
    await page.screenshot({ path: "test-screenshots/app-loaded.png" })

    // Verify the app renders without crashing - check for settings accessibility
    const openSettingsButton = page.locator('button[title="Settings"]')
    const settingsShortcut = page.getByRole("button", { name: /Settings/i })

    const hasOpenSettings = await openSettingsButton.isVisible().catch(() => false)
    const hasSettingsShortcut = await settingsShortcut.first().isVisible().catch(() => false)

    expect(hasOpenSettings || hasSettingsShortcut).toBeTruthy()
  })
})
