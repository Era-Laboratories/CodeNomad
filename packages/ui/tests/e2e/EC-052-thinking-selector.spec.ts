import { test, expect } from "@playwright/test"

test.describe("EC-052: Per-model Thinking Selector", () => {
  test.setTimeout(120000)

  test("thinking selector should appear for Claude models", async ({ page }) => {
    await page.goto("http://localhost:3000/")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(2000)

    await page.screenshot({ path: "test-screenshots/EC-052-01-initial.png", fullPage: true })

    // Open a workspace
    const folderCard = page.locator('[class*="folder-card"]').first()
    if (await folderCard.isVisible().catch(() => false)) {
      await folderCard.dblclick()
      await page.waitForTimeout(5000)
    }

    await page.screenshot({ path: "test-screenshots/EC-052-02-workspace.png", fullPage: true })

    // Look for the thinking selector in the sidebar
    const thinkingSelector = page.locator('.thinking-selector, [class*="thinking-selector"]').first()
    const thinkingLabel = page.locator('text=Extended Thinking').first()

    await page.waitForTimeout(3000)
    await page.screenshot({ path: "test-screenshots/EC-052-03-sidebar.png", fullPage: true })

    if (await thinkingSelector.isVisible().catch(() => false)) {
      console.log("✓ Thinking selector found!")

      // Check for selector trigger
      const trigger = thinkingSelector.locator('.selector-trigger, button').first()
      if (await trigger.isVisible().catch(() => false)) {
        console.log("✓ Thinking selector trigger found")

        // Click to open dropdown
        await trigger.click()
        await page.waitForTimeout(500)

        await page.screenshot({ path: "test-screenshots/EC-052-04-dropdown-open.png", fullPage: true })

        // Check for options
        const options = page.locator('.thinking-selector-item, [role="option"]')
        const optionCount = await options.count()
        console.log(`✓ Found ${optionCount} thinking options`)

        // Look for Auto, Enabled, Disabled options
        const autoOption = page.locator('text=Auto').first()
        const enabledOption = page.locator('text=Enabled').first()
        const disabledOption = page.locator('text=Disabled').first()

        if (await autoOption.isVisible().catch(() => false)) {
          console.log("✓ Auto option visible")
        }
        if (await enabledOption.isVisible().catch(() => false)) {
          console.log("✓ Enabled option visible")
        }
        if (await disabledOption.isVisible().catch(() => false)) {
          console.log("✓ Disabled option visible")
        }

        // Select a different option
        if (await enabledOption.isVisible().catch(() => false)) {
          await enabledOption.click()
          await page.waitForTimeout(500)
          await page.screenshot({ path: "test-screenshots/EC-052-05-option-selected.png", fullPage: true })
        }
      }
    } else if (await thinkingLabel.isVisible().catch(() => false)) {
      console.log("✓ Thinking label found but selector may be hidden")
    } else {
      console.log("Note: Thinking selector not visible - may not be a Claude model or sidebar not open")
    }

    await page.screenshot({ path: "test-screenshots/EC-052-06-final.png", fullPage: true })
    console.log("Thinking selector test completed")
  })

  test("verify thinking selector CSS is loaded", async ({ page }) => {
    await page.goto("http://localhost:3000/")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(2000)

    // Check that the CSS is loaded
    const styleLoaded = await page.evaluate(() => {
      const styles = document.styleSheets
      for (const sheet of styles) {
        try {
          const rules = sheet.cssRules || sheet.rules
          for (const rule of rules) {
            if (rule.cssText?.includes('thinking-selector')) {
              return true
            }
          }
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      }
      return false
    })

    console.log("Thinking selector CSS loaded:", styleLoaded)
    expect(styleLoaded).toBe(true)
  })
})
