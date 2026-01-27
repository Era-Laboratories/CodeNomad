import { test, expect } from "@playwright/test"

/**
 * Comprehensive Settings UI Review
 * Captures screenshots and analyzes each section for:
 * - Legacy "Open X pane" buttons that redirect elsewhere
 * - UI/UX issues (spacing, layout, consistency)
 * - Missing functionality
 * - Design improvements needed
 */

test.describe("Settings UI Review", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector('button[title="Settings"], button:has-text("Settings")', { timeout: 15000 })
  })

  async function openFullSettings(page: any) {
    // Try multiple ways to open settings

    // Method 1: From home screen - click the "Settings" shortcut button at bottom
    const homeSettingsBtn = page.getByRole("button", { name: /Cmd.*Settings/i }).first()
    if (await homeSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await homeSettingsBtn.click()
      await page.waitForTimeout(500)

      // Look for "All Settings" button in quick settings panel
      const allSettingsBtn = page.getByRole("button", { name: /All Settings/i }).first()
      if (await allSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await allSettingsBtn.click()
        await page.waitForTimeout(500)
        return
      }
    }

    // Method 2: From main app - click settings icon in tab bar
    const settingsBtn = page.locator('button[title="Settings"], button[title="Open settings"]').first()
    if (await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsBtn.click()
      await page.waitForTimeout(500)

      // Look for "All Settings" button
      const allSettingsBtn = page.getByRole("button", { name: /All Settings/i }).first()
      if (await allSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await allSettingsBtn.click()
        await page.waitForTimeout(500)
      }
    }

    // Wait for Full Settings to be visible
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 5000 })
  }

  test("Review: General Section", async ({ page }) => {
    await openFullSettings(page)

    // Click General in sidebar
    const generalNav = page.getByRole("button", { name: /^General$/i }).first()
    await generalNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/01-general.png", fullPage: true })

    // Check for any "Open X" buttons
    const openButtons = await page.locator('button:has-text("Open")').count()
    console.log(`[General] Found ${openButtons} "Open" buttons`)

    // Log section content
    const content = await page.locator('.full-settings-section').first().textContent()
    console.log(`[General] Content preview: ${content?.substring(0, 200)}...`)
  })

  test("Review: Session Section", async ({ page }) => {
    await openFullSettings(page)

    const sessionNav = page.getByRole("button", { name: /^Session$/i }).first()
    await sessionNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/02-session.png", fullPage: true })

    const openButtons = await page.locator('button:has-text("Open")').count()
    console.log(`[Session] Found ${openButtons} "Open" buttons`)
  })

  test("Review: Models Section", async ({ page }) => {
    await openFullSettings(page)

    const modelsNav = page.getByRole("button", { name: /^Models$/i }).first()
    await modelsNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/03-models.png", fullPage: true })

    // Check for Edit buttons
    const editButtons = await page.locator('button:has-text("Edit")').count()
    console.log(`[Models] Found ${editButtons} Edit buttons`)

    // Check for Sync button
    const syncButton = page.getByRole("button", { name: /Sync Now/i })
    const hasSyncButton = await syncButton.isVisible().catch(() => false)
    console.log(`[Models] Has Sync button: ${hasSyncButton}`)

    // Scroll to see full section
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('.full-settings-content')
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight
    })
    await page.waitForTimeout(200)
    await page.screenshot({ path: "test-screenshots/review/03-models-scrolled.png", fullPage: true })
  })

  test("Review: MCP Servers Section", async ({ page }) => {
    await openFullSettings(page)

    const mcpNav = page.getByRole("button", { name: /MCP Servers/i }).first()
    await mcpNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/04-mcp-servers.png", fullPage: true })

    const openButtons = await page.locator('button:has-text("Open")').count()
    console.log(`[MCP] Found ${openButtons} "Open" buttons`)

    // Check for legacy "Open MCP Settings" button
    const legacyBtn = page.locator('button:has-text("Open MCP Settings")')
    const hasLegacyBtn = await legacyBtn.isVisible().catch(() => false)
    console.log(`[MCP] Has legacy "Open MCP Settings" button: ${hasLegacyBtn}`)
  })

  test("Review: Slash Commands Section", async ({ page }) => {
    await openFullSettings(page)

    const commandsNav = page.getByRole("button", { name: /Slash Commands/i }).first()
    await commandsNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/05-slash-commands.png", fullPage: true })

    const openButtons = await page.locator('button:has-text("Open")').count()
    console.log(`[Commands] Found ${openButtons} "Open" buttons`)
  })

  test("Review: Rules Section", async ({ page }) => {
    await openFullSettings(page)

    const rulesNav = page.getByRole("button", { name: /^Rules$/i }).first()
    await rulesNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/06-rules.png", fullPage: true })

    const openButtons = await page.locator('button:has-text("Open")').count()
    console.log(`[Rules] Found ${openButtons} "Open" buttons`)
  })

  test("Review: Directives Section", async ({ page }) => {
    await openFullSettings(page)

    const directivesNav = page.getByRole("button", { name: /Directives/i }).first()
    await directivesNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/07-directives.png", fullPage: true })

    const openButtons = await page.locator('button:has-text("Open")').count()
    console.log(`[Directives] Found ${openButtons} "Open" buttons`)
  })

  test("Review: Environment Section", async ({ page }) => {
    await openFullSettings(page)

    const envNav = page.getByRole("button", { name: /Environment/i }).first()
    await envNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/08-environment.png", fullPage: true })

    const openButtons = await page.locator('button:has-text("Open")').count()
    console.log(`[Environment] Found ${openButtons} "Open" buttons`)
  })

  test("Review: Accounts Section", async ({ page }) => {
    await openFullSettings(page)

    const accountsNav = page.getByRole("button", { name: /Accounts/i }).first()
    await accountsNav.click()
    await page.waitForTimeout(500)

    await page.screenshot({ path: "test-screenshots/review/09-accounts.png", fullPage: true })

    // Check GitHub and Google Cloud status
    const githubStatus = await page.locator('.full-settings-account-status').first().textContent()
    console.log(`[Accounts] GitHub status: ${githubStatus}`)

    // Scroll to see full section
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('.full-settings-content')
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight
    })
    await page.waitForTimeout(200)
    await page.screenshot({ path: "test-screenshots/review/09-accounts-scrolled.png", fullPage: true })
  })

  test("Review: Era Code Section", async ({ page }) => {
    await openFullSettings(page)

    const eraNav = page.getByRole("button", { name: /Era Code/i }).first()
    await eraNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/10-era-code.png", fullPage: true })

    const openButtons = await page.locator('button:has-text("Open")').count()
    console.log(`[Era Code] Found ${openButtons} "Open" buttons`)
  })

  test("Review: About Section", async ({ page }) => {
    await openFullSettings(page)

    const aboutNav = page.getByRole("button", { name: /About/i }).first()
    await aboutNav.click()
    await page.waitForTimeout(300)

    await page.screenshot({ path: "test-screenshots/review/11-about.png", fullPage: true })
  })

  test("Summary: Find all legacy 'Open' buttons", async ({ page }) => {
    await openFullSettings(page)

    const sections = [
      "General", "Session", "Models", "MCP Servers", "Slash Commands",
      "Rules", "Directives", "Environment", "Accounts", "Era Code", "About"
    ]

    const issues: string[] = []

    for (const section of sections) {
      const navBtn = page.getByRole("button", { name: new RegExp(`^${section}$`, "i") }).first()
      if (await navBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await navBtn.click()
        await page.waitForTimeout(300)

        // Find all buttons with "Open" text
        const openButtons = page.locator('button:has-text("Open")')
        const count = await openButtons.count()

        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const btnText = await openButtons.nth(i).textContent()
            issues.push(`[${section}] Legacy button: "${btnText?.trim()}"`)
          }
        }

        // Find any "Coming Soon" badges
        const comingSoon = await page.locator('.full-settings-coming-soon').count()
        if (comingSoon > 0) {
          issues.push(`[${section}] Has ${comingSoon} "Coming Soon" items`)
        }
      }
    }

    console.log("\n=== SETTINGS REVIEW SUMMARY ===")
    if (issues.length > 0) {
      issues.forEach(issue => console.log(issue))
    } else {
      console.log("No legacy 'Open' buttons found!")
    }
    console.log("=== END SUMMARY ===\n")
  })
})
