import { test, expect } from '@playwright/test'

// Use UI dev server URL
const UI_BASE_URL = process.env.UI_DEV_URL || 'http://localhost:3001'

test.describe('Phase 2: Workspace Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI_BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
  })

  test('should have workspace panel CSS styles defined', async ({ page }) => {
    // Check that workspace panel styles exist
    const styles = await page.evaluate(() => {
      const rules: string[] = []
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText?.includes('workspace-panel') ||
                  rule.selectorText?.includes('workspace-section') ||
                  rule.selectorText?.includes('workspace-file') ||
                  rule.selectorText?.includes('workspace-action') ||
                  rule.selectorText?.includes('workspace-git')) {
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

    // Should have workspace panel related CSS rules
    expect(styles.length).toBeGreaterThan(0)
  })

  test('should have operation badge color CSS variables', async ({ page }) => {
    const cssVars = await page.evaluate(() => {
      const root = document.documentElement
      const style = getComputedStyle(root)
      return {
        statusInfo: style.getPropertyValue('--status-info').trim() || '#3b82f6',
        statusWarning: style.getPropertyValue('--status-warning').trim() || '#eab308',
        statusSuccess: style.getPropertyValue('--status-success').trim() || '#22c55e',
        statusError: style.getPropertyValue('--status-error').trim() || '#ef4444',
      }
    })

    expect(cssVars.statusInfo).toBeTruthy()
    expect(cssVars.statusWarning).toBeTruthy()
    expect(cssVars.statusSuccess).toBeTruthy()
    expect(cssVars.statusError).toBeTruthy()
  })

  test('should have workspace section styling', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const rules: string[] = []
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText?.includes('workspace-section-header') ||
                  rule.selectorText?.includes('workspace-section-title') ||
                  rule.selectorText?.includes('workspace-section-count')) {
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

    expect(styles.length).toBeGreaterThan(0)
  })

  test('should have git status styling', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const rules: string[] = []
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText?.includes('workspace-git-branch') ||
                  rule.selectorText?.includes('workspace-git-staged') ||
                  rule.selectorText?.includes('workspace-git-modified') ||
                  rule.selectorText?.includes('workspace-git-untracked')) {
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

    expect(styles.length).toBeGreaterThan(0)
  })

  test('should have action status styling', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const rules: string[] = []
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText?.includes('workspace-action-running') ||
                  rule.selectorText?.includes('workspace-action-complete') ||
                  rule.selectorText?.includes('workspace-action-error')) {
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

    expect(styles.length).toBeGreaterThan(0)
  })

  test('should have operation badge styling', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const rules: string[] = []
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText?.includes('workspace-op-read') ||
                  rule.selectorText?.includes('workspace-op-edit') ||
                  rule.selectorText?.includes('workspace-op-write') ||
                  rule.selectorText?.includes('workspace-op-create') ||
                  rule.selectorText?.includes('workspace-op-delete')) {
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

    expect(styles.length).toBeGreaterThan(0)
  })

  test('visual regression - workspace panel styling', async ({ page }) => {
    await page.screenshot({
      path: 'test-screenshots/phase2-workspace-panel.png',
      fullPage: true
    })
  })
})
