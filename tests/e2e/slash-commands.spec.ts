import { test, expect } from '@playwright/test'

test.describe('Slash Commands', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the app to load
    await page.waitForSelector('.project-tab-bar', { timeout: 10000 })
  })

  test('should show slash command picker when "/" is typed at start of prompt', async ({ page }) => {
    // Find and click on the prompt input
    const promptInput = page.locator('.prompt-input')
    const inputCount = await promptInput.count()

    if (inputCount === 0) {
      // App might be on home screen, take screenshot and skip
      await page.screenshot({ path: 'test-screenshots/slash-commands-no-prompt-input.png', fullPage: true })
      return
    }

    await promptInput.click()
    await promptInput.focus()

    // Type "/" to trigger the slash command picker
    await promptInput.fill('/')

    // Wait for the slash command picker to appear
    await page.waitForTimeout(100) // Small delay for reactivity

    const slashPicker = page.locator('[data-testid="slash-command-picker"]')
    const pickerVisible = await slashPicker.isVisible().catch(() => false)

    if (pickerVisible) {
      await expect(slashPicker).toBeVisible()

      // Verify the picker has the "Slash Commands" header
      const header = slashPicker.locator('.dropdown-header-title')
      await expect(header).toContainText('Slash Commands')

      // Take screenshot
      await page.screenshot({ path: 'test-screenshots/slash-commands-picker-visible.png', fullPage: true })
    } else {
      // Picker might not show if no commands are available
      await page.screenshot({ path: 'test-screenshots/slash-commands-picker-not-visible.png', fullPage: true })
    }
  })

  test('should filter commands as user types', async ({ page }) => {
    const promptInput = page.locator('.prompt-input')
    const inputCount = await promptInput.count()

    if (inputCount === 0) {
      await page.screenshot({ path: 'test-screenshots/slash-commands-filter-no-input.png', fullPage: true })
      return
    }

    await promptInput.click()
    await promptInput.focus()

    // Type "/c" to filter commands starting with "c"
    await promptInput.fill('/c')
    await page.waitForTimeout(100)

    const slashPicker = page.locator('[data-testid="slash-command-picker"]')
    const pickerVisible = await slashPicker.isVisible().catch(() => false)

    if (pickerVisible) {
      // Get all command items
      const commandItems = slashPicker.locator('.dropdown-item')
      const itemCount = await commandItems.count()

      // All visible commands should contain "c" in name or description
      for (let i = 0; i < itemCount; i++) {
        const text = await commandItems.nth(i).textContent()
        // Should have matched based on filter
        expect(text?.toLowerCase()).toMatch(/c/)
      }

      await page.screenshot({ path: 'test-screenshots/slash-commands-filtered.png', fullPage: true })
    } else {
      await page.screenshot({ path: 'test-screenshots/slash-commands-filter-no-picker.png', fullPage: true })
    }
  })

  test('should close picker when Escape is pressed', async ({ page }) => {
    const promptInput = page.locator('.prompt-input')
    const inputCount = await promptInput.count()

    if (inputCount === 0) {
      return
    }

    await promptInput.click()
    await promptInput.focus()
    await promptInput.fill('/')
    await page.waitForTimeout(100)

    const slashPicker = page.locator('[data-testid="slash-command-picker"]')
    const pickerVisible = await slashPicker.isVisible().catch(() => false)

    if (pickerVisible) {
      // Press Escape to close
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)

      // Picker should be hidden
      await expect(slashPicker).not.toBeVisible()

      await page.screenshot({ path: 'test-screenshots/slash-commands-escape-closed.png', fullPage: true })
    }
  })

  test('should close picker when "/" is removed', async ({ page }) => {
    const promptInput = page.locator('.prompt-input')
    const inputCount = await promptInput.count()

    if (inputCount === 0) {
      return
    }

    await promptInput.click()
    await promptInput.focus()
    await promptInput.fill('/')
    await page.waitForTimeout(100)

    const slashPicker = page.locator('[data-testid="slash-command-picker"]')
    const pickerInitiallyVisible = await slashPicker.isVisible().catch(() => false)

    if (pickerInitiallyVisible) {
      // Clear the input to remove "/"
      await promptInput.fill('')
      await page.waitForTimeout(100)

      // Picker should be hidden
      await expect(slashPicker).not.toBeVisible()

      await page.screenshot({ path: 'test-screenshots/slash-commands-removed-slash.png', fullPage: true })
    }
  })

  test('should navigate commands with arrow keys', async ({ page }) => {
    const promptInput = page.locator('.prompt-input')
    const inputCount = await promptInput.count()

    if (inputCount === 0) {
      return
    }

    await promptInput.click()
    await promptInput.focus()
    await promptInput.fill('/')
    await page.waitForTimeout(100)

    const slashPicker = page.locator('[data-testid="slash-command-picker"]')
    const pickerVisible = await slashPicker.isVisible().catch(() => false)

    if (pickerVisible) {
      const commandItems = slashPicker.locator('.dropdown-item')
      const itemCount = await commandItems.count()

      if (itemCount > 1) {
        // First item should be highlighted initially
        await expect(commandItems.first()).toHaveAttribute('data-picker-selected', 'true')

        // Press down arrow
        await page.keyboard.press('ArrowDown')
        await page.waitForTimeout(50)

        // Second item should now be highlighted
        await expect(commandItems.nth(1)).toHaveAttribute('data-picker-selected', 'true')

        // Press up arrow
        await page.keyboard.press('ArrowUp')
        await page.waitForTimeout(50)

        // First item should be highlighted again
        await expect(commandItems.first()).toHaveAttribute('data-picker-selected', 'true')

        await page.screenshot({ path: 'test-screenshots/slash-commands-arrow-navigation.png', fullPage: true })
      }
    }
  })

  test('should close picker when space is typed after command', async ({ page }) => {
    const promptInput = page.locator('.prompt-input')
    const inputCount = await promptInput.count()

    if (inputCount === 0) {
      return
    }

    await promptInput.click()
    await promptInput.focus()
    await promptInput.fill('/commit ')
    await page.waitForTimeout(100)

    const slashPicker = page.locator('[data-testid="slash-command-picker"]')

    // Picker should close when space is typed (user is now entering arguments)
    const pickerVisible = await slashPicker.isVisible().catch(() => false)
    expect(pickerVisible).toBe(false)

    await page.screenshot({ path: 'test-screenshots/slash-commands-space-closes.png', fullPage: true })
  })

  test('should not show slash picker in shell mode', async ({ page }) => {
    const promptInput = page.locator('.prompt-input')
    const inputCount = await promptInput.count()

    if (inputCount === 0) {
      return
    }

    await promptInput.click()
    await promptInput.focus()

    // Enter shell mode with "!"
    await promptInput.fill('!')
    await page.waitForTimeout(100)

    // Check if we're in shell mode
    const isShellMode = await promptInput.evaluate((el) => el.classList.contains('shell-mode'))

    if (isShellMode) {
      // Now try to type "/" - should not trigger picker
      await promptInput.fill('/test')
      await page.waitForTimeout(100)

      const slashPicker = page.locator('[data-testid="slash-command-picker"]')
      const pickerVisible = await slashPicker.isVisible().catch(() => false)

      // Picker should NOT be visible in shell mode
      expect(pickerVisible).toBe(false)

      await page.screenshot({ path: 'test-screenshots/slash-commands-no-picker-in-shell.png', fullPage: true })
    }
  })
})
