import { test, expect } from "@playwright/test"

test.describe("Session Manager", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Wait for the app to load
    await page.waitForSelector('button[title="Settings"], button:has-text("Settings")', { timeout: 10000 })
  })

  test("Should navigate to All Sessions section in Settings", async ({ page }) => {
    // Click on Settings button to open settings
    const openSettingsButton = page.locator('button[title="Settings"]')
    const settingsShortcut = page.getByRole("button", { name: /Cmd.*Settings/i }).first()

    if (await openSettingsButton.isVisible().catch(() => false)) {
      await openSettingsButton.click()
    } else if (await settingsShortcut.isVisible().catch(() => false)) {
      await settingsShortcut.click()
    }

    await page.waitForTimeout(500)

    // Look for All Settings button to open Full Settings
    const allSettingsBtn = page.getByRole("button", { name: /All Settings/i }).first()
    if (await allSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allSettingsBtn.click()
      await page.waitForTimeout(500)
    }

    // Take screenshot of full settings sidebar
    await page.screenshot({ path: "test-screenshots/EC-045-01-full-settings.png" })

    // Click on "All Sessions" in the sidebar navigation
    const sessionsNav = page.getByRole("button", { name: /All Sessions/i })
    await expect(sessionsNav).toBeVisible({ timeout: 5000 })
    await sessionsNav.click()
    await page.waitForTimeout(500)

    // Take screenshot of Session Manager section
    await page.screenshot({ path: "test-screenshots/EC-045-02-session-manager.png" })

    // Verify the Session Manager header is visible
    const sectionTitle = page.locator("h2").filter({ hasText: /All Sessions/i })
    await expect(sectionTitle).toBeVisible({ timeout: 3000 })

    // Verify the description is present
    const description = page.getByText(/Manage OpenCode sessions across all projects/i)
    await expect(description).toBeVisible()
  })

  test("Should display Session Manager toolbar with filters and actions", async ({ page }) => {
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

    // Navigate to All Sessions
    const sessionsNav = page.getByRole("button", { name: /All Sessions/i })
    await sessionsNav.click()
    await page.waitForTimeout(500)

    // Verify toolbar elements exist
    // 1. Project filter dropdown (should show "All Projects")
    const projectFilter = page.locator("select").filter({ hasText: /All Projects/i })
    await expect(projectFilter).toBeVisible({ timeout: 3000 })

    // 2. Search input
    const searchInput = page.getByPlaceholder(/Search sessions/i)
    await expect(searchInput).toBeVisible()

    // 3. Refresh button
    const refreshButton = page.getByRole("button", { name: /Refresh/i })
    await expect(refreshButton).toBeVisible()

    // 4. Delete button (should show count of 0 initially)
    const deleteButton = page.getByRole("button", { name: /Delete/i })
    await expect(deleteButton).toBeVisible()

    // Take screenshot of toolbar
    await page.screenshot({ path: "test-screenshots/EC-045-03-toolbar.png" })
  })

  test("Should display session table with header columns", async ({ page }) => {
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

    // Navigate to All Sessions
    const sessionsNav = page.getByRole("button", { name: /All Sessions/i })
    await sessionsNav.click()
    await page.waitForTimeout(500)

    // Verify table structure exists
    const sessionTable = page.locator(".session-table")
    await expect(sessionTable).toBeVisible({ timeout: 3000 })

    // Verify table header columns
    const tableHeader = page.locator(".session-table-header")
    await expect(tableHeader).toBeVisible()

    // Check for column headers
    const sessionColumn = tableHeader.getByText(/Session/i)
    const projectColumn = tableHeader.getByText(/Project/i)
    const changesColumn = tableHeader.getByText(/Changes/i)
    const updatedColumn = tableHeader.getByText(/Updated/i)

    await expect(sessionColumn).toBeVisible()
    await expect(projectColumn).toBeVisible()
    await expect(changesColumn).toBeVisible()
    await expect(updatedColumn).toBeVisible()

    // Take screenshot of table
    await page.screenshot({ path: "test-screenshots/EC-045-04-table-structure.png" })
  })

  test("Should show sessions or empty state", async ({ page }) => {
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

    // Navigate to All Sessions
    const sessionsNav = page.getByRole("button", { name: /All Sessions/i })
    await sessionsNav.click()

    // Wait for loading to complete
    await page.waitForTimeout(1000)

    // Either we have sessions displayed or we see "No sessions found"
    const tableBody = page.locator(".session-table-body")
    await expect(tableBody).toBeVisible({ timeout: 3000 })

    // Check if we have sessions or empty state
    const sessionRows = page.locator(".session-table-row")
    const emptyState = page.getByText(/No sessions found/i)
    const loadingState = page.getByText(/Loading sessions/i)

    // Wait for loading to finish
    await expect(loadingState).not.toBeVisible({ timeout: 5000 })

    // Should either have sessions or empty state
    const rowCount = await sessionRows.count()
    const hasEmptyState = await emptyState.isVisible().catch(() => false)

    // Take screenshot of sessions or empty state
    await page.screenshot({ path: "test-screenshots/EC-045-05-sessions-display.png" })

    // One of these must be true
    expect(rowCount > 0 || hasEmptyState).toBeTruthy()

    // Log what we found
    if (rowCount > 0) {
      console.log(`Found ${rowCount} sessions`)
    } else {
      console.log("No sessions found (empty state displayed)")
    }
  })

  test("Should allow searching sessions", async ({ page }) => {
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

    // Navigate to All Sessions
    const sessionsNav = page.getByRole("button", { name: /All Sessions/i })
    await sessionsNav.click()
    await page.waitForTimeout(1000)

    // Find and interact with search input
    const searchInput = page.getByPlaceholder(/Search sessions/i)
    await expect(searchInput).toBeVisible()

    // Type a search query
    await searchInput.fill("test")
    await page.waitForTimeout(300)

    // Take screenshot after search
    await page.screenshot({ path: "test-screenshots/EC-045-06-search-filter.png" })

    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(300)

    // Verify it returns to normal state
    await page.screenshot({ path: "test-screenshots/EC-045-07-search-cleared.png" })
  })

  test("Should have refresh functionality", async ({ page }) => {
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

    // Navigate to All Sessions
    const sessionsNav = page.getByRole("button", { name: /All Sessions/i })
    await sessionsNav.click()
    await page.waitForTimeout(1000)

    // Find and click refresh button
    const refreshButton = page.getByRole("button", { name: /Refresh/i })
    await expect(refreshButton).toBeVisible()

    // Take screenshot before refresh
    await page.screenshot({ path: "test-screenshots/EC-045-08-before-refresh.png" })

    // Click refresh
    await refreshButton.click()

    // Wait for the refresh to complete
    await page.waitForTimeout(500)

    // Take screenshot after refresh
    await page.screenshot({ path: "test-screenshots/EC-045-09-after-refresh.png" })
  })

  test("Should display footer with session count", async ({ page }) => {
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

    // Navigate to All Sessions
    const sessionsNav = page.getByRole("button", { name: /All Sessions/i })
    await sessionsNav.click()
    await page.waitForTimeout(1000)

    // Verify footer exists with session count
    const footer = page.locator(".session-manager-footer")
    await expect(footer).toBeVisible({ timeout: 3000 })

    // Should show "X sessions" text
    const sessionCountText = footer.getByText(/\d+ sessions/i)
    await expect(sessionCountText).toBeVisible()

    // Take screenshot of footer
    await page.screenshot({ path: "test-screenshots/EC-045-10-footer.png" })
  })
})
