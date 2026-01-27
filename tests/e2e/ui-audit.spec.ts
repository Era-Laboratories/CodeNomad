import { test, expect } from '@playwright/test'

const UI_URL = process.env.UI_DEV_URL || 'http://localhost:3000'

test.describe('UI/UX Audit - Comprehensive Review', () => {
  test.setTimeout(120000) // 2 minute timeout

  test('Full UI audit with screenshots and interaction testing', async ({ page }) => {
    const results: string[] = []
    const issues: string[] = []

    // Navigate to the app
    await page.goto(UI_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(5000)

    // Take initial screenshot
    await page.screenshot({
      path: 'test-screenshots/audit-01-initial-state.png',
      fullPage: true
    })
    results.push('Initial state captured')

    // ========== LEFT SIDEBAR AUDIT ==========
    console.log('\n========== LEFT SIDEBAR AUDIT ==========')

    // Check if INSTANCE section was removed
    const instanceHeader = await page.locator('text=Instance').first()
    const instanceVisible = await instanceHeader.isVisible().catch(() => false)
    if (instanceVisible) {
      issues.push('LEFT SIDEBAR: INSTANCE section still visible - should be removed per spec')
    } else {
      results.push('LEFT SIDEBAR: INSTANCE section correctly removed')
    }

    // Check for AGENTS section
    const agentsHeader = await page.locator('.session-section-header:has-text("Agents")').first()
    const agentsVisible = await agentsHeader.isVisible().catch(() => false)
    if (agentsVisible) {
      results.push('LEFT SIDEBAR: AGENTS section visible')
    } else {
      issues.push('LEFT SIDEBAR: AGENTS section not found')
    }

    // Check pin button exists
    const pinButton = await page.locator('button[aria-label*="pin"]').first()
    const pinVisible = await pinButton.isVisible().catch(() => false)
    if (pinVisible) {
      results.push('LEFT SIDEBAR: Pin button present')
    } else {
      issues.push('LEFT SIDEBAR: Pin button not found')
    }

    // ========== BOTTOM STATUS BAR AUDIT ==========
    console.log('\n========== BOTTOM STATUS BAR AUDIT ==========')

    // Check bottom status bar exists
    const bottomBar = await page.locator('.bottom-status-bar')
    const bottomBarVisible = await bottomBar.isVisible().catch(() => false)
    if (bottomBarVisible) {
      results.push('BOTTOM BAR: Status bar visible')
    } else {
      issues.push('BOTTOM BAR: Status bar not found')
    }

    // Check for project name
    const projectSection = await page.locator('.bottom-status-project')
    const projectVisible = await projectSection.isVisible().catch(() => false)
    if (projectVisible) {
      const projectText = await projectSection.textContent()
      results.push(`BOTTOM BAR: Project name visible - "${projectText?.trim()}"`)
    } else {
      issues.push('BOTTOM BAR: Project name section not found')
    }

    // Check for git status (per spec: "main ↑2 ↓0")
    const gitSection = await page.locator('.bottom-status-git')
    const gitVisible = await gitSection.isVisible().catch(() => false)
    if (gitVisible) {
      const gitText = await gitSection.textContent()
      results.push(`BOTTOM BAR: Git status visible - "${gitText?.trim()}"`)
    } else {
      issues.push('BOTTOM BAR: Git status NOT visible - spec shows "main ↑2 ↓0" after project name')
    }

    // Check context usage
    const contextSection = await page.locator('.bottom-status-context')
    const contextVisible = await contextSection.isVisible().catch(() => false)
    if (contextVisible) {
      const contextText = await contextSection.textContent()
      results.push(`BOTTOM BAR: Context visible - "${contextText?.trim()}"`)
    } else {
      issues.push('BOTTOM BAR: Context section not found')
    }

    // Check model display
    const modelSection = await page.locator('.bottom-status-model')
    const modelVisible = await modelSection.isVisible().catch(() => false)
    if (modelVisible) {
      const modelText = await modelSection.textContent()
      results.push(`BOTTOM BAR: Model visible - "${modelText?.trim()}"`)
    } else {
      issues.push('BOTTOM BAR: Model section not found')
    }

    // Check cost display
    const costSection = await page.locator('.bottom-status-cost')
    const costVisible = await costSection.isVisible().catch(() => false)
    if (costVisible) {
      const costText = await costSection.textContent()
      results.push(`BOTTOM BAR: Cost visible - "${costText?.trim()}"`)
    } else {
      // Cost may be hidden when $0.00 - check if that's intentional
      results.push('BOTTOM BAR: Cost section not visible (may be hidden when $0.00)')
    }

    // ========== MCP BUTTON CLICK TEST ==========
    console.log('\n========== MCP BUTTON CLICK TEST ==========')

    const mcpButton = await page.locator('.bottom-status-mcp')
    const mcpVisible = await mcpButton.isVisible().catch(() => false)
    if (mcpVisible) {
      results.push('BOTTOM BAR: MCP indicator visible')

      // Try clicking it
      await mcpButton.click()
      await page.waitForTimeout(1000)

      // Check if a modal/panel opened
      const mcpModal = await page.locator('.mcp-settings-modal, [role="dialog"]:has-text("MCP")').first()
      const mcpModalVisible = await mcpModal.isVisible().catch(() => false)

      if (mcpModalVisible) {
        results.push('MCP CLICK: Modal/panel opened successfully')
        await page.screenshot({ path: 'test-screenshots/audit-02-mcp-modal.png', fullPage: true })
        // Close it
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      } else {
        issues.push('MCP CLICK: No modal/panel opened after clicking MCP button')
      }
    } else {
      issues.push('BOTTOM BAR: MCP indicator not found')
    }

    // ========== INSTANCE BUTTON CLICK TEST ==========
    console.log('\n========== INSTANCE BUTTON CLICK TEST ==========')

    const instanceButton = await page.locator('.bottom-status-instance')
    const instanceBtnVisible = await instanceButton.isVisible().catch(() => false)
    if (instanceBtnVisible) {
      const instanceText = await instanceButton.textContent()
      results.push(`BOTTOM BAR: Instance indicator visible - "${instanceText?.trim()}"`)

      // Try clicking it
      await instanceButton.click()
      await page.waitForTimeout(1000)

      // Check if settings panel or modal opened
      const settingsPanel = await page.locator('.settings-panel, [role="dialog"]:has-text("Settings"), [role="dialog"]:has-text("Instance")').first()
      const settingsVisible = await settingsPanel.isVisible().catch(() => false)

      if (settingsVisible) {
        results.push('INSTANCE CLICK: Settings panel opened')
        await page.screenshot({ path: 'test-screenshots/audit-03-instance-settings.png', fullPage: true })
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      } else {
        issues.push('INSTANCE CLICK: No panel opened after clicking instance button - should open settings/developer tools')
      }
    } else {
      issues.push('BOTTOM BAR: Instance indicator not found')
    }

    // ========== LSP BUTTON TEST ==========
    console.log('\n========== LSP BUTTON TEST ==========')

    const lspButton = await page.locator('.bottom-status-lsp')
    const lspVisible = await lspButton.isVisible().catch(() => false)
    if (lspVisible) {
      results.push('BOTTOM BAR: LSP indicator visible')
      await lspButton.click()
      await page.waitForTimeout(1000)
      // Check for response
      const anyDialog = await page.locator('[role="dialog"]').first()
      const dialogOpen = await anyDialog.isVisible().catch(() => false)
      if (dialogOpen) {
        results.push('LSP CLICK: Dialog opened')
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      } else {
        issues.push('LSP CLICK: No dialog opened after clicking')
      }
    } else {
      results.push('BOTTOM BAR: LSP indicator not visible (may be hidden when no LSP servers)')
    }

    // ========== GOVERNANCE BUTTON TEST ==========
    console.log('\n========== GOVERNANCE BUTTON TEST ==========')

    const govButton = await page.locator('.bottom-status-governance')
    const govVisible = await govButton.isVisible().catch(() => false)
    if (govVisible) {
      results.push('BOTTOM BAR: Governance indicator visible')
      await govButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-screenshots/audit-04-governance.png', fullPage: true })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    // ========== DIRECTIVES BUTTON TEST ==========
    console.log('\n========== DIRECTIVES BUTTON TEST ==========')

    const directivesButton = await page.locator('.bottom-status-directives')
    const directivesVisible = await directivesButton.isVisible().catch(() => false)
    if (directivesVisible) {
      results.push('BOTTOM BAR: Directives indicator visible')
      await directivesButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-screenshots/audit-05-directives.png', fullPage: true })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    // ========== RIGHT SIDEBAR (WORKSPACE) AUDIT ==========
    console.log('\n========== RIGHT SIDEBAR AUDIT ==========')

    // Check WORKSPACE header
    const workspaceHeader = await page.locator('text=WORKSPACE').first()
    const workspaceVisible = await workspaceHeader.isVisible().catch(() => false)
    if (workspaceVisible) {
      results.push('RIGHT SIDEBAR: WORKSPACE section visible')
    } else {
      issues.push('RIGHT SIDEBAR: WORKSPACE section not found')
    }

    // Check Files Touched section
    const filesTouched = await page.locator('text=Files Touched').first()
    const filesTouchedVisible = await filesTouched.isVisible().catch(() => false)
    if (filesTouchedVisible) {
      results.push('RIGHT SIDEBAR: Files Touched section visible')
    } else {
      issues.push('RIGHT SIDEBAR: Files Touched section not found')
    }

    // Check Recent Actions section
    const recentActions = await page.locator('text=Recent Actions').first()
    const recentActionsVisible = await recentActions.isVisible().catch(() => false)
    if (recentActionsVisible) {
      results.push('RIGHT SIDEBAR: Recent Actions section visible')
    } else {
      issues.push('RIGHT SIDEBAR: Recent Actions section not found')
    }

    // Check Git Status section
    const gitStatusSection = await page.locator('text=Git Status').first()
    const gitStatusVisible = await gitStatusSection.isVisible().catch(() => false)
    if (gitStatusVisible) {
      results.push('RIGHT SIDEBAR: Git Status section visible')
    } else {
      issues.push('RIGHT SIDEBAR: Git Status section not found')
    }

    // ========== SPEC COMPARISON ==========
    console.log('\n========== SPEC COMPARISON ==========')

    // Per spec Section 3.6, bottom bar should show:
    // | project-name | main ↑2 ↓0 | Context: 15K/400K | $0.03 | [⚙️ 🟢] |
    //      ↑              ↑                ↑              ↑         ↑
    //   Project       Git status      Context usage   Session   Settings +
    //   name          (if git repo)   (progress bar)   cost      Status

    const specIssues = []

    // Check order of elements in bottom bar
    const bottomBarText = await bottomBar.textContent()
    console.log('Bottom bar content:', bottomBarText)

    // Settings icon (gear) should be at the end per spec
    const settingsIcon = await page.locator('.bottom-status-bar button:has(.lucide-settings), .bottom-status-bar [aria-label*="settings"]').first()
    const settingsIconVisible = await settingsIcon.isVisible().catch(() => false)
    if (!settingsIconVisible) {
      specIssues.push('SPEC: Settings icon (⚙️) not found in bottom bar - spec shows it at the end')
    }

    // Status indicator (green dot) should be at the end
    const statusDot = await page.locator('.bottom-status-bar .status-dot, .bottom-status-bar text=Connected').first()
    const statusDotVisible = await statusDot.isVisible().catch(() => false)
    if (!statusDotVisible) {
      specIssues.push('SPEC: Status indicator (🟢) not found in bottom bar - spec shows it at the end')
    }

    // Final screenshot
    await page.screenshot({ path: 'test-screenshots/audit-06-final-state.png', fullPage: true })

    // ========== PRINT REPORT ==========
    console.log('\n\n==========================================')
    console.log('           UI AUDIT REPORT')
    console.log('==========================================\n')

    console.log('✅ PASSED CHECKS:')
    results.forEach(r => console.log(`   • ${r}`))

    console.log('\n❌ ISSUES FOUND:')
    issues.forEach(i => console.log(`   • ${i}`))
    specIssues.forEach(i => console.log(`   • ${i}`))

    console.log('\n📋 SPEC COMPARISON NOTES:')
    console.log('   Per spec Section 3.6, bottom bar should be:')
    console.log('   | project | main ↑2 ↓0 | Context: 15K/400K | $0.03 | [⚙️ 🟢] |')
    console.log('')

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      passed: results,
      issues: [...issues, ...specIssues],
      bottomBarContent: bottomBarText,
    }

    require('fs').writeFileSync(
      'test-screenshots/audit-report.json',
      JSON.stringify(report, null, 2)
    )

    console.log('\n📸 Screenshots saved to test-screenshots/audit-*.png')
    console.log('📄 Report saved to test-screenshots/audit-report.json')

    // Don't fail the test, just report
    expect(true).toBe(true)
  })
})
