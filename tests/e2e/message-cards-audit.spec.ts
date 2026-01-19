import { test, expect } from "@playwright/test"

/**
 * Message Cards UI/UX Audit
 *
 * This test captures screenshots of message cards in a session
 * for visual analysis and UI/UX improvement verification.
 */
test.describe("Message Cards UI Audit", () => {
  test.setTimeout(180000)

  test("capture message cards for UI analysis", async ({ page }) => {
    // Navigate to the full app on port 9898
    await page.goto("http://localhost:9898")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(3000)

    // Take initial screenshot
    await page.screenshot({
      path: "test-screenshots/messages-00-initial.png",
      fullPage: true,
    })

    console.log("=== Page Analysis ===")

    // Click on CodeNomad folder if visible
    const recentFolderItems = page.locator("text=CodeNomad").first()
    if (await recentFolderItems.isVisible().catch(() => false)) {
      console.log("Found CodeNomad in recent folders - clicking")
      await recentFolderItems.click()
      await page.waitForTimeout(3000)
    }

    // Handle auto-approve modal if it appears
    const autoApproveButton = page.locator("text=Proceed with auto-approve")
    if (await autoApproveButton.isVisible().catch(() => false)) {
      console.log("Auto-approve modal detected - clicking proceed")
      await autoApproveButton.click()
      await page.waitForTimeout(2000)
    }

    // Close any notification toasts by clicking X buttons
    const closeButtons = page.locator("button:has-text('×'), button[aria-label*='close'], button[aria-label*='dismiss']")
    for (let i = 0; i < 3; i++) {
      if (await closeButtons.first().isVisible().catch(() => false)) {
        await closeButtons.first().click().catch(() => {})
        await page.waitForTimeout(300)
      }
    }

    await page.screenshot({
      path: "test-screenshots/messages-01-workspace-ready.png",
      fullPage: true,
    })

    // Click on "Analyzing project session tree" tab which has messages
    const analyzingTab = page.locator("text=Analyzing project session tree")
    if (await analyzingTab.isVisible().catch(() => false)) {
      console.log("Found 'Analyzing project session tree' tab - clicking")
      await analyzingTab.click()
      await page.waitForTimeout(3000)

      await page.screenshot({
        path: "test-screenshots/messages-02-session-with-messages.png",
        fullPage: true,
      })
    } else {
      // Try to find any session tab with text content
      const sessionTabs = page.locator(".instance-tab, [class*='session-tab']")
      const tabCount = await sessionTabs.count()
      console.log(`Found ${tabCount} session tabs`)

      for (let i = 0; i < tabCount; i++) {
        const tab = sessionTabs.nth(i)
        const tabText = await tab.textContent().catch(() => "")
        console.log(`Tab ${i}: ${tabText?.substring(0, 50)}`)

        if (tabText && !tabText.includes("New session") && !tabText.includes("New")) {
          console.log(`Clicking on tab ${i} with text: ${tabText.substring(0, 30)}`)
          await tab.click()
          await page.waitForTimeout(3000)
          break
        }
      }
    }

    // Also try clicking on "Analyzing project session tree" in left sidebar
    const sidebarSession = page.locator("text=Analyzing project session tree").first()
    if (await sidebarSession.isVisible().catch(() => false)) {
      console.log("Found session in sidebar - clicking")
      await sidebarSession.click()
      await page.waitForTimeout(3000)
    }

    await page.screenshot({
      path: "test-screenshots/messages-03-after-session-click.png",
      fullPage: true,
    })

    // Wait for messages to load
    await page.waitForTimeout(2000)

    // Check for any existing messages
    const messages = page.locator(".message-item-base, .message-section")
    const messageCount = await messages.count()
    console.log(`Found ${messageCount} message elements`)

    // Look for message list container
    const messageStream = page.locator(".message-stream")
    if (await messageStream.isVisible().catch(() => false)) {
      console.log("Found message stream container")

      await page.screenshot({
        path: "test-screenshots/messages-04-message-stream.png",
        fullPage: true,
      })
    }

    // Capture individual message cards with our new styling
    const messageCards = page.locator(".message-item-base")
    const cardCount = await messageCards.count()
    console.log(`Found ${cardCount} message cards (.message-item-base)`)

    // Look for user bubble messages (our new styling)
    const userBubbles = page.locator(".message-user-bubble")
    const userBubbleCount = await userBubbles.count()
    console.log(`Found ${userBubbleCount} user bubble messages (new styling)`)

    // Look for assistant messages
    const assistantMessages = page.locator(".assistant-message")
    const assistantCount = await assistantMessages.count()
    console.log(`Found ${assistantCount} assistant messages`)

    // Screenshot individual cards
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const card = messageCards.nth(i)
      if (await card.isVisible().catch(() => false)) {
        await card.screenshot({
          path: `test-screenshots/messages-05-card-${i}.png`,
        })

        const classes = await card.getAttribute("class")
        console.log(`Card ${i} classes: ${classes}`)
      }
    }

    // Look for tool call sections with new visual connectors
    const toolCalls = page.locator(".tool-call-message, [class*='tool-call']")
    const toolCallCount = await toolCalls.count()
    console.log(`Found ${toolCallCount} tool call elements`)

    if (toolCallCount > 0) {
      await page.screenshot({
        path: "test-screenshots/messages-06-tool-calls.png",
        fullPage: true,
      })

      // Try to find the new pill-style collapse toggle
      const collapseToggle = page.locator(".message-block-collapse-toggle")
      const toggleCount = await collapseToggle.count()
      console.log(`Found ${toggleCount} pill-style collapse toggles (new styling)`)

      if (toggleCount > 0) {
        await collapseToggle.first().screenshot({
          path: "test-screenshots/messages-07-collapse-toggle.png",
        })
      }
    }

    // Look for message stream blocks (our new grouped styling)
    const streamBlocks = page.locator(".message-stream-block")
    const blockCount = await streamBlocks.count()
    console.log(`Found ${blockCount} message stream blocks`)

    // Test hover behavior on message cards
    if (cardCount > 0) {
      const firstCard = messageCards.first()
      if (await firstCard.isVisible().catch(() => false)) {
        await page.screenshot({
          path: "test-screenshots/messages-08-before-hover.png",
          fullPage: true,
        })

        // Hover over the card
        await firstCard.hover()
        await page.waitForTimeout(500)

        await page.screenshot({
          path: "test-screenshots/messages-09-after-hover.png",
          fullPage: true,
        })

        const actionButtons = firstCard.locator(".message-action-button, .message-item-actions button")
        const actionCount = await actionButtons.count()
        console.log(`Found ${actionCount} action buttons in hovered card`)
      }
    }

    // Look for the bottom status bar
    const bottomBar = page.locator(".bottom-status-bar")
    if (await bottomBar.isVisible().catch(() => false)) {
      await bottomBar.screenshot({
        path: "test-screenshots/messages-10-bottom-bar.png",
      })
    }

    // Take final full-page screenshot
    await page.screenshot({
      path: "test-screenshots/messages-11-final.png",
      fullPage: true,
    })

    // Summary of new styling checks
    console.log("\n=== New Styling Verification ===")
    console.log(`User bubble messages: ${userBubbleCount}`)
    console.log(`Assistant messages: ${assistantCount}`)
    console.log(`Tool calls with connectors: ${toolCallCount}`)
    console.log(`Pill-style collapse toggles: ${await page.locator(".message-block-collapse-toggle").count()}`)
    console.log(`Stream blocks with increased spacing: ${blockCount}`)

    console.log("\n=== Test Complete ===")
    console.log("Screenshots saved to test-screenshots/messages-*.png")
  })
})
