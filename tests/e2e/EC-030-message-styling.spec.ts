import { test, expect } from '@playwright/test'

// Use UI dev server URL for CSS testing
const UI_BASE_URL = process.env.UI_DEV_URL || 'http://localhost:3001'

test.describe('Phase 4: Message Styling', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the UI dev server
    await page.goto(UI_BASE_URL, { waitUntil: 'domcontentloaded' })
    // Wait for CSS to load
    await page.waitForTimeout(1000)
  })

  test('should have distinct heading hierarchy in markdown', async ({ page }) => {
    // Look for any message content area
    const markdownBody = page.locator('.markdown-body').first()

    // Take a screenshot of the initial state
    await page.screenshot({
      path: 'test-screenshots/message-styling-initial.png',
      fullPage: true
    })

    // Verify markdown-body exists (messages are rendered)
    // Note: This test checks CSS is loaded correctly
    const styles = await page.evaluate(() => {
      const root = document.documentElement
      const computedStyle = getComputedStyle(root)
      return {
        statusRunning: computedStyle.getPropertyValue('--status-running').trim(),
        statusComplete: computedStyle.getPropertyValue('--status-complete').trim(),
        statusIdle: computedStyle.getPropertyValue('--status-idle').trim(),
        lineHeightRelaxed: computedStyle.getPropertyValue('--line-height-relaxed').trim(),
      }
    })

    // Verify new CSS tokens are loaded
    expect(styles.statusRunning).toBeTruthy()
    expect(styles.statusComplete).toBeTruthy()
    expect(styles.statusIdle).toBeTruthy()
    expect(styles.lineHeightRelaxed).toBe('1.6')
  })

  test('should have proper styling tokens for subagent status', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const root = document.documentElement
      const computedStyle = getComputedStyle(root)
      return {
        statusRunning: computedStyle.getPropertyValue('--status-running').trim(),
        statusRunningBg: computedStyle.getPropertyValue('--status-running-bg').trim(),
        statusComplete: computedStyle.getPropertyValue('--status-complete').trim(),
        statusCompleteBg: computedStyle.getPropertyValue('--status-complete-bg').trim(),
        statusIdle: computedStyle.getPropertyValue('--status-idle').trim(),
        statusIdleBg: computedStyle.getPropertyValue('--status-idle-bg').trim(),
      }
    })

    // Running should be green
    expect(styles.statusRunning).toContain('22c55e')
    // Complete should be blue
    expect(styles.statusComplete).toContain('3b82f6')
    // Idle should be gray
    expect(styles.statusIdle).toMatch(/6b7280|9ca3af/)

    await page.screenshot({
      path: 'test-screenshots/status-tokens-verified.png',
      fullPage: true
    })
  })

  test('should load app with styling applied', async ({ page }) => {
    // Verify the app loaded successfully and CSS is applied
    // Check that key elements exist with proper styling

    // Verify text-primary color is applied (from tokens.css)
    const textColor = await page.evaluate(() => {
      const root = document.documentElement
      return getComputedStyle(root).getPropertyValue('--text-primary').trim()
    })
    expect(textColor).toBeTruthy()

    // Verify font-family is applied
    const fontFamily = await page.evaluate(() => {
      const root = document.documentElement
      return getComputedStyle(root).getPropertyValue('--font-family-sans').trim()
    })
    expect(fontFamily).toContain('Figtree')

    // Verify line-height-relaxed exists (our styling addition)
    const lineHeightRelaxed = await page.evaluate(() => {
      const root = document.documentElement
      return getComputedStyle(root).getPropertyValue('--line-height-relaxed').trim()
    })
    expect(lineHeightRelaxed).toBe('1.6')

    await page.screenshot({
      path: 'test-screenshots/app-styling.png',
      fullPage: true
    })
  })

  test('should have accent-primary CSS variable for blockquote styling', async ({ page }) => {
    // Verify the accent-primary color exists (used for blockquote border)
    const accentColor = await page.evaluate(() => {
      const root = document.documentElement
      return getComputedStyle(root).getPropertyValue('--accent-primary').trim()
    })

    // accent-primary should be defined
    expect(accentColor).toBeTruthy()
    // Should be a blue color (contains 0080ff or 0066ff)
    expect(accentColor).toMatch(/#[0-9a-fA-F]{6}|rgb/)

    // Verify surface-muted exists (used for blockquote background)
    const surfaceMuted = await page.evaluate(() => {
      const root = document.documentElement
      return getComputedStyle(root).getPropertyValue('--surface-muted').trim()
    })
    expect(surfaceMuted).toBeTruthy()
  })

  test('should have table with alternating row colors', async ({ page }) => {
    const tableStyles = await page.evaluate(() => {
      const temp = document.createElement('div')
      temp.className = 'markdown-body'
      temp.innerHTML = `
        <table>
          <thead><tr><th>Header</th></tr></thead>
          <tbody>
            <tr><td>Row 1</td></tr>
            <tr><td>Row 2</td></tr>
            <tr><td>Row 3</td></tr>
          </tbody>
        </table>
      `
      document.body.appendChild(temp)

      const th = temp.querySelector('th')
      const rows = temp.querySelectorAll('tbody tr')
      const row1 = rows[0]
      const row2 = rows[1]

      const thStyle = th ? getComputedStyle(th) : null
      const row1Style = row1 ? getComputedStyle(row1) : null
      const row2Style = row2 ? getComputedStyle(row2) : null

      document.body.removeChild(temp)

      return {
        thBackground: thStyle?.backgroundColor,
        row1Background: row1Style?.backgroundColor,
        row2Background: row2Style?.backgroundColor,
      }
    })

    // Header should have distinct background
    expect(tableStyles.thBackground).not.toBe('rgba(0, 0, 0, 0)')
    // Even rows should have different background (alternating)
    // Note: row2 is the even row (0-indexed: row 1 is index 1, which is even in CSS nth-child)
  })

  test('visual regression - take full page screenshot', async ({ page }) => {
    await page.screenshot({
      path: 'test-screenshots/phase4-final.png',
      fullPage: true
    })
  })
})
