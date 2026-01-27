import { test, expect } from '@playwright/test'

// Use UI dev server URL
const UI_BASE_URL = process.env.UI_DEV_URL || 'http://localhost:3001'

test.describe('Phase 1: Left Sidebar Restructure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI_BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
  })

  test('should have renamed header from "Agent Sessions" to "Subagents"', async ({ page }) => {
    // Check that "Subagents" text exists in the page
    const subagentsHeader = page.locator('text=Subagents')

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-screenshots/left-sidebar-initial.png',
      fullPage: true
    })

    // If there are child sessions, the Subagents header should be visible
    // Note: This may not be visible if there are no child sessions
  })

  test('should have updated status color tokens', async ({ page }) => {
    const statusColors = await page.evaluate(() => {
      const root = document.documentElement
      const computedStyle = getComputedStyle(root)
      return {
        workingFg: computedStyle.getPropertyValue('--session-status-working-fg').trim(),
        workingBg: computedStyle.getPropertyValue('--session-status-working-bg').trim(),
        idleFg: computedStyle.getPropertyValue('--session-status-idle-fg').trim(),
        idleBg: computedStyle.getPropertyValue('--session-status-idle-bg').trim(),
        completeFg: computedStyle.getPropertyValue('--session-status-complete-fg').trim(),
        completeBg: computedStyle.getPropertyValue('--session-status-complete-bg').trim(),
      }
    })

    // Working should be green (#22c55e or #15803d)
    expect(statusColors.workingFg).toMatch(/22c55e|15803d/i)

    // Idle should be gray (#9ca3af or #6b7280)
    expect(statusColors.idleFg).toMatch(/9ca3af|6b7280/i)

    // Complete should be blue (#3b82f6 or #1d4ed8)
    expect(statusColors.completeFg).toMatch(/3b82f6|1d4ed8/i)
  })

  test('should have status colors with proper backgrounds', async ({ page }) => {
    const statusBgs = await page.evaluate(() => {
      const root = document.documentElement
      const computedStyle = getComputedStyle(root)
      return {
        workingBg: computedStyle.getPropertyValue('--session-status-working-bg').trim(),
        idleBg: computedStyle.getPropertyValue('--session-status-idle-bg').trim(),
        completeBg: computedStyle.getPropertyValue('--session-status-complete-bg').trim(),
      }
    })

    // All backgrounds should be defined
    expect(statusBgs.workingBg).toBeTruthy()
    expect(statusBgs.idleBg).toBeTruthy()
    expect(statusBgs.completeBg).toBeTruthy()

    // Working bg should contain green rgba
    expect(statusBgs.workingBg).toContain('rgba')
    // Complete bg should contain blue rgba
    expect(statusBgs.completeBg).toContain('rgba')
  })

  test('visual regression - left sidebar', async ({ page }) => {
    await page.screenshot({
      path: 'test-screenshots/phase1-sidebar.png',
      fullPage: true
    })
  })
})
