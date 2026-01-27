import { test, expect } from "@playwright/test"

/**
 * Visual Review Test for Inline Tool Calls
 */

test.describe("Inline Tool Call Visual Review", () => {
  test.setTimeout(120000) // 2 minutes

  test("capture inline tool display", async ({ page }) => {
    // Connect to the dev server with our changes
    await page.goto("http://localhost:3000")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(2000)

    // Screenshot 1: Initial home screen
    await page.screenshot({
      path: "test-screenshots/inline-01-home.png",
      fullPage: true,
    })

    // Click on era-code project
    const eraCodeProject = page.locator('text=~/era-code').first()
    if (await eraCodeProject.isVisible().catch(() => false)) {
      console.log("Clicking on era-code project...")
      await eraCodeProject.click()
      await page.waitForTimeout(2000)
    }

    // Handle permission modal if it appears
    const proceedButton = page.locator('button:has-text("Proceed with auto-approve")')
    if (await proceedButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("Dismissing permission modal...")
      await proceedButton.click()
      await page.waitForTimeout(1000)
    }

    // Screenshot 2: After dismissing modal
    await page.screenshot({
      path: "test-screenshots/inline-02-project.png",
      fullPage: true,
    })

    // Look for existing session to resume - click on "Project package dependencies overview"
    const existingSession = page.locator('text=Project package dependencies overview').first()
    if (await existingSession.isVisible().catch(() => false)) {
      console.log("Clicking on existing session...")
      await existingSession.click()
      await page.waitForTimeout(3000)
    }

    // Screenshot 3: After clicking session
    await page.screenshot({
      path: "test-screenshots/inline-03-session.png",
      fullPage: true,
    })

    // Analyze what we have
    const counts = await page.evaluate(() => {
      return {
        inlineTools: document.querySelectorAll('.inline-tool-call').length,
        groupedTools: document.querySelectorAll('.grouped-tools-container').length,
        groupedToggle: document.querySelectorAll('.grouped-tools-toggle').length,
        subAgents: document.querySelectorAll('.tool-call-subagent').length,
        messageBlocks: document.querySelectorAll('.message-stream-block').length,
        toolCallMessages: document.querySelectorAll('.tool-call-message').length,
        bottomStatusBar: document.querySelectorAll('.bottom-status-bar').length,
      }
    })

    console.log("\n=== ELEMENT COUNTS ===")
    console.log(JSON.stringify(counts, null, 2))

    // Screenshot the message area
    const messageList = page.locator('.message-block-list, .message-stream').first()
    if (await messageList.isVisible().catch(() => false)) {
      await messageList.screenshot({
        path: "test-screenshots/inline-04-messages.png",
      })
    }

    // Look for inline tools
    const inlineTools = page.locator('.inline-tool-call')
    const inlineCount = await inlineTools.count()
    console.log(`Found ${inlineCount} inline tool calls`)

    if (inlineCount > 0) {
      // Screenshot each inline tool
      for (let i = 0; i < Math.min(inlineCount, 5); i++) {
        const tool = inlineTools.nth(i)
        await tool.screenshot({
          path: `test-screenshots/inline-tool-${i}.png`,
        })
        const text = await tool.textContent()
        console.log(`Tool ${i}: ${text?.slice(0, 100)}`)
      }

      // Test clicking on a tool to open modal
      console.log("Testing modal open...")
      await inlineTools.first().click()
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: "test-screenshots/inline-05-modal.png",
        fullPage: true,
      })

      // Close modal
      await page.keyboard.press("Escape")
      await page.waitForTimeout(500)
    }

    // Check for OLD grouped tools (should NOT appear)
    const groupedTools = page.locator('.grouped-tools-container, .grouped-tools-toggle')
    const groupedCount = await groupedTools.count()
    if (groupedCount > 0) {
      console.log(`\n⚠️  WARNING: Found ${groupedCount} OLD grouped tools!`)
      await groupedTools.first().screenshot({
        path: "test-screenshots/inline-WARNING-grouped.png",
      })
    }

    // Screenshot bottom status bar
    const statusBar = page.locator('.bottom-status-bar')
    if (await statusBar.isVisible().catch(() => false)) {
      await statusBar.screenshot({
        path: "test-screenshots/inline-06-statusbar.png",
      })
    }

    // Final screenshot
    await page.screenshot({
      path: "test-screenshots/inline-07-final.png",
      fullPage: true,
    })

    console.log("\n=== SUMMARY ===")
    console.log(`Inline tools (NEW): ${counts.inlineTools}`)
    console.log(`Grouped tools (OLD): ${counts.groupedTools + counts.groupedToggle}`)
    console.log(`Sub-agents: ${counts.subAgents}`)
    console.log(`Message blocks: ${counts.messageBlocks}`)
    console.log(`Tool call messages: ${counts.toolCallMessages}`)
  })
})
