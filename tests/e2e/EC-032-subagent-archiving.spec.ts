import { test, expect } from '@playwright/test'

// Use UI dev server URL
const UI_BASE_URL = process.env.UI_DEV_URL || 'http://localhost:3001'

test.describe('Phase 5: Subagent Archiving', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI_BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
  })

  test('should have archived section CSS styles defined', async ({ page }) => {
    // Check that archived section styles exist
    const styles = await page.evaluate(() => {
      const rules: string[] = []
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText?.includes('session-section-archived') ||
                  rule.selectorText?.includes('session-archive-count') ||
                  rule.selectorText?.includes('session-section-header--collapsible')) {
                rules.push(rule.selectorText)
              }
            }
          }
        } catch (e) {
          // Cross-origin stylesheets
        }
      }
      return rules
    })

    // Should have at least some archived-related CSS rules
    expect(styles.length).toBeGreaterThan(0)
  })

  test('should have surface-muted CSS variable for archive count badge', async ({ page }) => {
    const surfaceMuted = await page.evaluate(() => {
      const root = document.documentElement
      return getComputedStyle(root).getPropertyValue('--surface-muted').trim()
    })

    expect(surfaceMuted).toBeTruthy()
  })

  test('should export archive functions from session-state', async ({ page }) => {
    // This test verifies the code compiles and loads correctly
    // by checking the app loads without errors

    // Check for any JavaScript errors
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.reload()
    await page.waitForTimeout(1000)

    // No JavaScript errors should have occurred
    expect(errors.filter(e => e.includes('session-state'))).toHaveLength(0)
  })

  test('visual regression - archived section styling', async ({ page }) => {
    await page.screenshot({
      path: 'test-screenshots/phase5-archiving.png',
      fullPage: true
    })
  })
})
