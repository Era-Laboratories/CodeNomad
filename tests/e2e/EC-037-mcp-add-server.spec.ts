import { test, expect } from "@playwright/test"

test.describe("EC-037: MCP Add Server Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(2000)
  })

  test("should add a new MCP server via settings panel", async ({ page }) => {
    // Step 1: Open settings
    await page.screenshot({ path: "test-screenshots/EC-037-01-initial.png", fullPage: true })

    const openSettingsButton = page.locator('button[title="Settings"]')
    const settingsShortcut = page.getByRole("button", { name: /Cmd.*Settings/i }).first()

    if (await openSettingsButton.isVisible().catch(() => false)) {
      await openSettingsButton.click()
    } else if (await settingsShortcut.isVisible().catch(() => false)) {
      await settingsShortcut.click()
    }

    await page.waitForTimeout(500)
    await page.screenshot({ path: "test-screenshots/EC-037-02-settings-open.png", fullPage: true })

    // Step 2: Open Full Settings
    const allSettingsBtn = page.getByRole("button", { name: /All Settings/i }).first()
    if (await allSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allSettingsBtn.click()
      await page.waitForTimeout(500)
    }

    await page.screenshot({ path: "test-screenshots/EC-037-03-full-settings.png", fullPage: true })

    // Step 3: Navigate to MCP Servers section
    const mcpNav = page.getByRole("button", { name: /MCP Servers/i }).first()
    if (await mcpNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mcpNav.click()
      await page.waitForTimeout(500)
    }

    await page.screenshot({ path: "test-screenshots/EC-037-04-mcp-section.png", fullPage: true })

    // Step 4: Fill in the inline form (panel form has Name, Type, Command, Add button)
    // Name input - look for input with placeholder "e.g. context7" or similar
    const nameInput = page.locator('input[placeholder*="context"]').first()
    await expect(nameInput).toBeVisible({ timeout: 5000 })
    await nameInput.fill("test-everything")

    // Command input - it's pre-filled with npx -y @modelcontextprotocol/server-everything
    // But we'll verify it's there and clear/fill with our test server
    const commandInput = page.locator('input[placeholder*="npx"], input[value*="npx"]').first()
    await expect(commandInput).toBeVisible({ timeout: 3000 })
    await commandInput.clear()
    await commandInput.fill("npx -y @modelcontextprotocol/server-everything")

    await page.screenshot({ path: "test-screenshots/EC-037-05-form-filled.png", fullPage: true })

    // Step 5: Click "Add" button to add the server
    const addBtn = page.getByRole("button", { name: /^Add$/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 3000 })
    await addBtn.click()
    await page.waitForTimeout(500)

    await page.screenshot({ path: "test-screenshots/EC-037-06-server-added.png", fullPage: true })

    // Step 6: Verify server appears in the list
    // Look for the server name in the list
    const serverEntry = page.locator('text=test-everything')
    const serverInList = await serverEntry.isVisible({ timeout: 3000 }).catch(() => false)

    await page.screenshot({ path: "test-screenshots/EC-037-07-final.png", fullPage: true })

    expect(serverInList).toBeTruthy()
  })

  test("should display built-in Era Code MCP servers", async ({ page }) => {
    // Navigate to MCP settings
    const openSettingsButton = page.locator('button[title="Settings"]')
    const settingsShortcut = page.getByRole("button", { name: /Cmd.*Settings/i }).first()

    if (await openSettingsButton.isVisible().catch(() => false)) {
      await openSettingsButton.click()
    } else if (await settingsShortcut.isVisible().catch(() => false)) {
      await settingsShortcut.click()
    }
    await page.waitForTimeout(500)

    const allSettingsBtn = page.getByRole("button", { name: /All Settings/i }).first()
    if (await allSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allSettingsBtn.click()
      await page.waitForTimeout(500)
    }

    const mcpNav = page.getByRole("button", { name: /MCP Servers/i }).first()
    if (await mcpNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mcpNav.click()
      await page.waitForTimeout(500)
    }

    await page.screenshot({ path: "test-screenshots/EC-037-builtin-servers.png", fullPage: true })

    // Verify built-in servers are displayed
    const linearServer = page.locator('text=linear-server')
    const notionServer = page.locator('text=notion-docs-reader')
    const playwrightServer = page.locator('text=playwright')

    const hasLinear = await linearServer.isVisible({ timeout: 3000 }).catch(() => false)
    const hasNotion = await notionServer.isVisible({ timeout: 3000 }).catch(() => false)
    const hasPlaywright = await playwrightServer.isVisible({ timeout: 3000 }).catch(() => false)

    // At least some built-in servers should be visible
    expect(hasLinear || hasNotion || hasPlaywright).toBeTruthy()

    // Look for Era Code badges
    const eraCodeBadges = page.locator('text=Era Code')
    const badgeCount = await eraCodeBadges.count()
    expect(badgeCount).toBeGreaterThan(0)
  })

  test("should toggle server enabled state", async ({ page }) => {
    // Navigate to MCP settings
    const openSettingsButton = page.locator('button[title="Settings"]')
    const settingsShortcut = page.getByRole("button", { name: /Cmd.*Settings/i }).first()

    if (await openSettingsButton.isVisible().catch(() => false)) {
      await openSettingsButton.click()
    } else if (await settingsShortcut.isVisible().catch(() => false)) {
      await settingsShortcut.click()
    }
    await page.waitForTimeout(500)

    const allSettingsBtn = page.getByRole("button", { name: /All Settings/i }).first()
    if (await allSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allSettingsBtn.click()
      await page.waitForTimeout(500)
    }

    const mcpNav = page.getByRole("button", { name: /MCP Servers/i }).first()
    if (await mcpNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mcpNav.click()
      await page.waitForTimeout(500)
    }

    // Find an "Enabled" checkbox for any server
    const enabledCheckbox = page.locator('input[type="checkbox"]').first()
    await expect(enabledCheckbox).toBeVisible({ timeout: 3000 })

    // Get initial state
    const initialChecked = await enabledCheckbox.isChecked()
    await page.screenshot({ path: "test-screenshots/EC-037-before-toggle.png", fullPage: true })

    // Toggle the checkbox
    await enabledCheckbox.click()
    await page.waitForTimeout(300)

    // Verify state changed
    const newChecked = await enabledCheckbox.isChecked()
    expect(newChecked).not.toBe(initialChecked)

    await page.screenshot({ path: "test-screenshots/EC-037-after-toggle.png", fullPage: true })

    // Toggle back to restore original state
    await enabledCheckbox.click()
    await page.waitForTimeout(300)
  })
})
