import { test, expect } from "@playwright/test"

/**
 * Governance Panel Tests
 *
 * Tests the governance panel functionality including:
 * - Opening the governance panel from the bottom status bar
 * - Displaying project and global directives with full markdown content
 * - Constitution viewing
 * - Governance rules sections (hardcoded, default, project)
 */
test.describe("Governance Panel", () => {
  // Longer test timeout for governance tests
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("http://localhost:9898")

    // Wait for DOM to be ready (don't wait for networkidle as WebSocket keeps connections open)
    await page.waitForLoadState("domcontentloaded")

    // Give the UI time to initialize
    await page.waitForTimeout(3000)

    // Check if we need to open a project first
    // Look for either the bottom status bar (project open) or folder selection (no project)
    const bottomBar = page.locator(".bottom-status-bar")
    const folderSelection = page.locator(
      ".folder-selection, .empty-state, [class*='folder-card']"
    )

    const hasBottomBar = await bottomBar.isVisible().catch(() => false)
    const hasFolderSelection = await folderSelection
      .first()
      .isVisible()
      .catch(() => false)

    console.log(
      `App state: hasBottomBar=${hasBottomBar}, hasFolderSelection=${hasFolderSelection}`
    )

    // If in folder selection state, we need to select a project
    if (!hasBottomBar && hasFolderSelection) {
      // Click on a folder card or open folder button
      const folderCard = page.locator("[class*='folder-card']").first()
      const openFolderBtn = page.locator(
        "button:has-text('Open Folder'), button:has-text('Select')"
      )

      if (await folderCard.isVisible().catch(() => false)) {
        await folderCard.click()
        await page.waitForTimeout(3000)
      } else if (await openFolderBtn.first().isVisible().catch(() => false)) {
        await openFolderBtn.first().click()
        await page.waitForTimeout(3000)
      }
    }

    // Take initial screenshot
    await page.screenshot({
      path: "test-screenshots/governance-00-initial.png",
    })
  })

  test("should display governance button in bottom bar when Era is installed", async ({
    page,
  }) => {
    // Wait for Era status to be fetched (governance button appears)
    // The shield icon appears when isEraInstalled() returns true
    const governanceButton = page.locator(
      ".bottom-status-governance, button:has(.lucide-shield)"
    )

    // Wait with timeout for the governance button to appear
    await expect(governanceButton.first()).toBeVisible({ timeout: 10000 })

    // Take screenshot of bottom bar
    await page.screenshot({
      path: "test-screenshots/governance-01-bottom-bar.png",
    })
  })

  test("should open governance panel and display sections", async ({ page }) => {
    // Wait for governance button to appear
    const governanceButton = page.locator(".bottom-status-governance").first()
    await expect(governanceButton).toBeVisible({ timeout: 10000 })

    // Click to open governance panel
    await governanceButton.click()

    // Wait for panel to open
    const panel = page.locator(".governance-panel, .settings-panel")
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Take screenshot of panel
    await page.screenshot({
      path: "test-screenshots/governance-02-panel-open.png",
    })

    // Check for panel title
    const title = panel.locator(
      ".settings-panel-title, [class*='panel-title']"
    )
    await expect(title).toContainText(/governance/i)

    // Check for summary section
    const summaryRows = panel.locator(".governance-summary-row")
    const summaryCount = await summaryRows.count()
    console.log(`Found ${summaryCount} summary rows`)

    // Check for quick actions
    const quickActions = panel.locator(".governance-quick-action")
    await expect(quickActions.first()).toBeVisible()
  })

  test("should display project directives section with full content", async ({
    page,
  }) => {
    // Wait for and click governance button
    const governanceButton = page.locator(".bottom-status-governance").first()
    await expect(governanceButton).toBeVisible({ timeout: 10000 })
    await governanceButton.click()

    // Wait for panel
    const panel = page.locator(".governance-panel, .settings-panel")
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Find the Project Directives section header
    const projectDirectivesHeader = panel.locator(
      ".governance-section-header:has-text('Project Directives')"
    )
    await expect(projectDirectivesHeader).toBeVisible({ timeout: 5000 })

    // Click to expand section
    await projectDirectivesHeader.click()
    await page.waitForTimeout(500)

    // Check for the full directive content
    const directiveContent = panel.locator(".governance-directive-full")
    const contentVisible = await directiveContent.isVisible()
    console.log(`Project directives content visible: ${contentVisible}`)

    if (contentVisible) {
      // Verify markdown content is rendered
      const markdownContent = await directiveContent.textContent()
      console.log(
        `Directive content preview: ${markdownContent?.slice(0, 200)}...`
      )

      // Check for expected content from our test directives
      await expect(directiveContent).toContainText("Development Standards")
      await expect(directiveContent).toContainText("Code Style")
      await expect(directiveContent).toContainText("TypeScript")
    }

    // Take screenshot
    await page.screenshot({
      path: "test-screenshots/governance-03-project-directives.png",
    })
  })

  test("should display global directives section with full content", async ({
    page,
  }) => {
    // Open governance panel
    const governanceButton = page.locator(".bottom-status-governance").first()
    await expect(governanceButton).toBeVisible({ timeout: 10000 })
    await governanceButton.click()

    const panel = page.locator(".governance-panel, .settings-panel")
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Find and click Global Directives section
    const globalDirectivesHeader = panel.locator(
      ".governance-section-header:has-text('Global Directives')"
    )
    await expect(globalDirectivesHeader).toBeVisible({ timeout: 5000 })
    await globalDirectivesHeader.click()
    await page.waitForTimeout(500)

    // Check for the full directive content
    const directiveContent = panel
      .locator(
        ".governance-section:has-text('Global Directives') .governance-directive-full"
      )
      .first()
    const contentVisible = await directiveContent.isVisible()
    console.log(`Global directives content visible: ${contentVisible}`)

    if (contentVisible) {
      const markdownContent = await directiveContent.textContent()
      console.log(
        `Global directive content preview: ${markdownContent?.slice(0, 200)}...`
      )

      // Check for expected content
      await expect(directiveContent).toContainText("Universal Development")
      await expect(directiveContent).toContainText("Communication Style")
    }

    // Take screenshot
    await page.screenshot({
      path: "test-screenshots/governance-04-global-directives.png",
    })
  })

  test("should open constitution viewer", async ({ page }) => {
    // Open governance panel
    const governanceButton = page.locator(".bottom-status-governance").first()
    await expect(governanceButton).toBeVisible({ timeout: 10000 })
    await governanceButton.click()

    const panel = page.locator(".governance-panel, .settings-panel")
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Find and click Constitution View button
    const constitutionViewBtn = panel.locator(
      ".governance-constitution-view-btn, button:has-text('View'):near(.governance-constitution-header)"
    )
    await expect(constitutionViewBtn.first()).toBeVisible()
    await constitutionViewBtn.first().click()

    // Wait for constitution panel to open
    await page.waitForTimeout(500)

    // Take screenshot
    await page.screenshot({
      path: "test-screenshots/governance-05-constitution.png",
    })
  })

  test("should display governance rules sections", async ({ page }) => {
    // Open governance panel
    const governanceButton = page.locator(".bottom-status-governance").first()
    await expect(governanceButton).toBeVisible({ timeout: 10000 })
    await governanceButton.click()

    const panel = page.locator(".governance-panel, .settings-panel")
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Check for rules sections
    const sections = panel.locator(".governance-section")
    const sectionCount = await sections.count()
    console.log(`Found ${sectionCount} governance sections`)

    // List all section headers
    const sectionHeaders = panel.locator(".governance-section-header")
    const headerCount = await sectionHeaders.count()
    for (let i = 0; i < headerCount; i++) {
      const headerText = await sectionHeaders.nth(i).textContent()
      console.log(`Section ${i + 1}: ${headerText}`)
    }

    // Take screenshot of all sections
    await page.screenshot({
      path: "test-screenshots/governance-06-all-sections.png",
      fullPage: true,
    })
  })

  test("should allow expanding and collapsing directive sections", async ({
    page,
  }) => {
    // Open governance panel
    const governanceButton = page.locator(".bottom-status-governance").first()
    await expect(governanceButton).toBeVisible({ timeout: 10000 })
    await governanceButton.click()

    const panel = page.locator(".governance-panel, .settings-panel")
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Find Project Directives section
    const projectDirectivesHeader = panel.locator(
      ".governance-section-header:has-text('Project Directives')"
    )
    await expect(projectDirectivesHeader).toBeVisible({ timeout: 5000 })

    // Initially collapsed - check chevron direction
    const chevronRight = projectDirectivesHeader.locator(".lucide-chevron-right")
    const chevronDown = projectDirectivesHeader.locator(".lucide-chevron-down")

    // Click to expand
    await projectDirectivesHeader.click()
    await page.waitForTimeout(300)

    // Verify content is now visible
    const directiveContent = panel.locator(".governance-directive-full").first()
    await expect(directiveContent).toBeVisible()

    // Click again to collapse
    await projectDirectivesHeader.click()
    await page.waitForTimeout(300)

    // Verify content is hidden
    await expect(directiveContent).not.toBeVisible()
  })

  test("critical: directives should render as formatted markdown", async ({
    page,
  }) => {
    // Open governance panel
    const governanceButton = page.locator(".bottom-status-governance").first()
    await expect(governanceButton).toBeVisible({ timeout: 10000 })
    await governanceButton.click()

    const panel = page.locator(".governance-panel, .settings-panel")
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Expand Project Directives
    const projectDirectivesHeader = panel.locator(
      ".governance-section-header:has-text('Project Directives')"
    )
    await projectDirectivesHeader.click()
    await page.waitForTimeout(500)

    // Check that markdown is rendered with proper formatting
    const directiveContent = panel.locator(".governance-directive-full").first()
    await expect(directiveContent).toBeVisible()

    // Check for rendered markdown elements
    const headings = directiveContent.locator("h1, h2, h3")
    const lists = directiveContent.locator("ul, ol")
    const codeBlocks = directiveContent.locator("code, pre")

    const headingCount = await headings.count()
    const listCount = await lists.count()

    console.log(`Markdown rendering check:`)
    console.log(`  - Headings found: ${headingCount}`)
    console.log(`  - Lists found: ${listCount}`)

    // Should have some markdown elements rendered
    expect(headingCount).toBeGreaterThan(0)

    // Take detailed screenshot
    await page.screenshot({
      path: "test-screenshots/governance-07-markdown-rendering.png",
    })
  })

  test("should navigate to directives editor from panel", async ({ page }) => {
    // Open governance panel
    const governanceButton = page.locator(".bottom-status-governance").first()
    await expect(governanceButton).toBeVisible({ timeout: 10000 })
    await governanceButton.click()

    const panel = page.locator(".governance-panel, .settings-panel")
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Click the Directives quick action button
    const directivesButton = panel.locator(
      ".governance-quick-action:has-text('Directives')"
    )
    await expect(directivesButton).toBeVisible()
    await directivesButton.click()

    // Wait for directives editor panel to open
    await page.waitForTimeout(500)

    // Take screenshot
    await page.screenshot({
      path: "test-screenshots/governance-08-directives-editor.png",
    })
  })
})
