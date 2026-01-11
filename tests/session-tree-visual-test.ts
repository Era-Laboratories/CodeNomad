import { chromium } from '@playwright/test'

async function runVisualTest() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  })
  const page = await context.newPage()

  console.log('Navigating to app...')

  try {
    // Navigate to Era Code dev server
    // Use 'domcontentloaded' instead of 'networkidle' because SSE connections never go idle
    await page.goto('http://localhost:5174', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    console.log('Navigation committed, waiting for UI to render...')

    // Wait for the project tab bar which indicates app has loaded
    await page.waitForSelector('.project-tab-bar', { timeout: 30000 }).catch(() => {
      console.log('Project tab bar not found, checking for loading state...')
    })

    // Wait longer for SolidJS app to fully hydrate
    await page.waitForTimeout(5000)

    // Get page content to see what's there
    const html = await page.content()
    console.log('Page content length:', html.length)
    console.log('Has body:', html.includes('<body'))
    console.log('Has project-tab-bar:', html.includes('project-tab-bar'))

    // Take screenshot without waiting for fonts
    await page.screenshot({
      path: 'test-screenshots/session-tree-01-initial.png',
      fullPage: true,
      timeout: 5000
    }).catch(async () => {
      console.log('Full page screenshot timed out, trying viewport only...')
      await page.screenshot({
        path: 'test-screenshots/session-tree-01-initial.png',
        fullPage: false,
        timeout: 5000
      })
    })
    console.log('Screenshot 1: Initial state saved')

    // Wait for project tab bar
    const projectTabBar = page.locator('.project-tab-bar')
    const hasProjectTabs = await projectTabBar.count() > 0
    console.log(`Project tab bar found: ${hasProjectTabs}`)

    // Check for session tab bar
    const sessionTabBar = page.locator('.session-tab-bar')
    const hasSessionTabs = await sessionTabBar.count() > 0
    console.log(`Session tab bar found: ${hasSessionTabs}`)

    if (hasSessionTabs) {
      // Take screenshot of session tabs
      await page.screenshot({
        path: 'test-screenshots/session-tree-02-with-sessions.png',
        fullPage: true
      })
      console.log('Screenshot 2: With sessions saved')

      // Count session tabs
      const sessionTabs = page.locator('.session-tab:not(.session-tab-new)')
      const tabCount = await sessionTabs.count()
      console.log(`Session tabs count: ${tabCount}`)

      // Check for badge elements (Phase 2)
      const badges = page.locator('.session-tab-badge')
      const badgeCount = await badges.count()
      console.log(`Session tab badges found: ${badgeCount}`)

      // Check for dropdown containers (Phase 2)
      const dropdownContainers = page.locator('.session-tab-dropdown-container')
      const dropdownCount = await dropdownContainers.count()
      console.log(`Dropdown containers found: ${dropdownCount}`)

      // Hover over first tab to show close button
      if (tabCount > 0) {
        await sessionTabs.first().hover()
        await page.waitForTimeout(300)
        await page.screenshot({
          path: 'test-screenshots/session-tree-03-hover-state.png',
          fullPage: true
        })
        console.log('Screenshot 3: Hover state saved')

        // If a badge exists, try clicking it to open dropdown
        if (badgeCount > 0) {
          await badges.first().click()
          await page.waitForTimeout(300)

          const openDropdown = page.locator('.session-tab-dropdown')
          const dropdownOpen = await openDropdown.count() > 0
          console.log(`Dropdown opened: ${dropdownOpen}`)

          if (dropdownOpen) {
            await page.screenshot({
              path: 'test-screenshots/session-tree-04-dropdown-open.png',
              fullPage: true
            })
            console.log('Screenshot 4: Dropdown open state saved')
          }
        }
      }
    } else {
      // Check if we're on the empty state / folder selection
      const emptyState = page.locator('.empty-state, .folder-selection-view')
      const hasEmptyState = await emptyState.count() > 0
      console.log(`Empty/folder selection state: ${hasEmptyState}`)

      // Try to create a new session via the "New" button if available
      const newButton = page.locator('.session-tab-new, button:has-text("New Session")')
      const hasNewButton = await newButton.count() > 0
      console.log(`New session button found: ${hasNewButton}`)
    }

    // Check for any dropdowns or child indicators
    const childIndicators = page.locator('.session-tab-badge, .session-tab-dropdown')
    const hasChildIndicators = await childIndicators.count() > 0
    console.log(`Child indicators/badges found: ${hasChildIndicators}`)

    // Verify CSS classes are available in the document
    const cssClasses = [
      'session-tab-badge',
      'session-tab-dropdown',
      'session-tab-dropdown-container',
      'session-dropdown-item'
    ]

    console.log('\n=== CSS Class Verification ===')
    for (const cls of cssClasses) {
      const hasClass = html.includes(cls) || await page.locator(`.${cls}`).count() > 0
      console.log(`  .${cls}: ${hasClass ? 'defined' : 'not found in DOM'}`)
    }

    console.log('\n=== Visual Test Summary ===')
    console.log(`- Project tabs: ${hasProjectTabs ? '✓' : '✗'}`)
    console.log(`- Session tabs: ${hasSessionTabs ? '✓' : '✗ (no sessions created)'}`)
    console.log(`- Phase 2 elements: ${hasChildIndicators ? '✓' : '✗ (no child sessions to test)'}`)
    console.log('===========================\n')

  } catch (error) {
    console.error('Error during test:', error)
    await page.screenshot({
      path: 'test-screenshots/session-tree-error.png',
      fullPage: true
    }).catch(() => {})
  } finally {
    await browser.close()
  }
}

runVisualTest().catch(console.error)
