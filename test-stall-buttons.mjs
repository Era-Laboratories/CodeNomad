import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:9898';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dismissModals(page) {
  // Handle any modals that might be open

  // Auto-approve modal
  const autoApproveBtn = page.locator('button:has-text("Proceed with auto-approve")');
  if (await autoApproveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('   Dismissing auto-approve modal...');
    await autoApproveBtn.click();
    await sleep(1000);
  }

  // Close any dialog with X button
  const closeBtn = page.locator('[role="dialog"] button:has(svg), .modal-close, button[aria-label="Close"]');
  if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    console.log('   Closing dialog...');
    await closeBtn.first().click();
    await sleep(500);
  }
}

async function testStallButtons() {
  console.log('Starting Playwright test for stall buttons...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  // Capture console logs
  const consoleLogs = [];
  const page = await context.newPage();
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('[ui-actions]') || text.includes('[App]') || text.includes('[InlineToolCall]')) {
      console.log('  CONSOLE:', text);
    }
  });

  try {
    // 1. Navigate to the app
    console.log('1. Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await page.screenshot({ path: 'test-screenshots/stall-01-initial.png' });
    console.log('   Screenshot: stall-01-initial.png');

    // 2. Handle folder selection if needed
    console.log('2. Checking for folder selection...');
    const homeScreen = await page.locator('text="Your AI-powered coding workspace"').isVisible({ timeout: 2000 }).catch(() => false);

    if (homeScreen) {
      console.log('   Home screen detected, clicking era-code folder...');
      // Click on the era-code folder item in the Recent section
      const folderItem = page.locator('text="era-code"').first();
      if (await folderItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await folderItem.click();
        console.log('   Clicked era-code folder, waiting for workspace to load...');
        await sleep(4000);
      } else {
        console.log('   era-code folder not found, trying to find any folder...');
        const anyFolder = page.locator('[class*="recent"] >> text=/.*/')
        await anyFolder.first().click();
        await sleep(4000);
      }
    }

    // 3. Handle any modals
    console.log('3. Dismissing any modals...');
    await dismissModals(page);
    await sleep(1000);
    await page.screenshot({ path: 'test-screenshots/stall-02-after-modals.png' });

    // 4. Create session if needed
    console.log('4. Checking for Create Session button...');
    const createBtn = page.locator('button:has-text("Create Session")');
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Clicking Create Session...');
      await createBtn.click();
      await sleep(3000);
    }

    // 4b. Check if we need to switch agent from Plan mode
    console.log('4b. Checking agent mode...');

    // The agent selector has data-agent-selector attribute on the trigger
    const agentTrigger = page.locator('[data-agent-selector]');
    if (await agentTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Check if current agent is Plan
      const currentAgentText = await agentTrigger.textContent();
      console.log('   Current agent:', currentAgentText);

      if (currentAgentText?.toLowerCase().includes('plan')) {
        console.log('   Agent is Plan, switching to Code...');
        await agentTrigger.click();
        await sleep(500);
        await page.screenshot({ path: 'test-screenshots/stall-agent-dropdown.png' });

        // Look for Code option in the listbox
        const codeOption = page.locator('[role="option"]:has-text("Code")').first();
        if (await codeOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('   Selecting Code agent...');
          await codeOption.click();
          await sleep(1000);
        } else {
          console.log('   Code option not found, closing dropdown');
          await page.keyboard.press('Escape');
        }
      }
    } else {
      console.log('   Agent selector not found')
    }

    await dismissModals(page);
    await page.screenshot({ path: 'test-screenshots/stall-03-workspace.png' });
    console.log('   Screenshot: stall-03-workspace.png');

    // 5. Find message input
    console.log('5. Looking for message input...');
    const inputSelectors = [
      'textarea',
      '[contenteditable="true"]',
      '.message-input',
      'input[type="text"]'
    ];

    let input = null;
    for (const selector of inputSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        input = el;
        console.log('   Found input:', selector);
        break;
      }
    }

    if (!input) {
      await page.screenshot({ path: 'test-screenshots/stall-04-no-input.png' });
      console.log('   No input found, checking page state...');

      // Debug: list all visible elements
      const allTextareas = await page.locator('textarea').count();
      const allInputs = await page.locator('input').count();
      console.log('   Textareas:', allTextareas, 'Inputs:', allInputs);

      throw new Error('Could not find message input');
    }

    // 6. Send a message to trigger a long-running tool
    console.log('6. Sending test message...');
    await input.click();
    await input.fill('Run this shell command: sleep 30 && echo done');
    await sleep(500);
    await page.keyboard.press('Enter');
    await sleep(2000);
    await page.screenshot({ path: 'test-screenshots/stall-05-message-sent.png' });

    // 7. Wait for tool to start running
    console.log('7. Waiting for tool call...');
    await page.waitForSelector('.inline-tool-call, .tool-call', { timeout: 30000 }).catch(() => {});
    await sleep(2000);
    await page.screenshot({ path: 'test-screenshots/stall-06-tool-running.png' });

    // 8. Wait for stall warning (20+ seconds)
    console.log('8. Waiting for stall warning (up to 25s)...');
    let stallFound = false;
    for (let i = 0; i < 25; i++) {
      const switchBtn = page.locator('.inline-tool-switch-model-btn, button:has-text("Switch Model")');
      if (await switchBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log('   Stall warning appeared after', i + 1, 'seconds');
        stallFound = true;
        break;
      }
      await sleep(1000);
      if (i % 5 === 0 && i > 0) {
        console.log('   Still waiting...', i, 'seconds');
      }
    }

    await page.screenshot({ path: 'test-screenshots/stall-07-stall-check.png' });

    if (!stallFound) {
      console.log('   No stall warning appeared. Checking tool states...');
      const inlineTools = await page.locator('.inline-tool-call').count();
      const runningTools = await page.locator('.inline-tool-status--running').count();
      const stalledTools = await page.locator('.inline-tool-call--stalled').count();
      console.log('   Inline tools:', inlineTools, 'Running:', runningTools, 'Stalled:', stalledTools);
    }

    // 9. Test View Details button FIRST (before Switch Model opens modal)
    console.log('9. Testing View Details button...');

    // Debug: check all stall buttons
    const allStallBtns = await page.locator('.inline-tool-call--stalled button').all();
    console.log('   Found', allStallBtns.length, 'buttons in stalled tool');
    for (let i = 0; i < allStallBtns.length; i++) {
      const text = await allStallBtns[i].textContent();
      const className = await allStallBtns[i].getAttribute('class');
      console.log(`   Button ${i}: "${text}" class="${className}"`);
    }

    // Use more specific selector - button with text "View Details" that is NOT the Switch Model button
    const viewDetailsBtn = page.locator('button.inline-tool-view-details-btn');
    if (await viewDetailsBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('    Clicking View Details (using class selector)...');
      await viewDetailsBtn.click();
      await sleep(1500);
      await page.screenshot({ path: 'test-screenshots/stall-09-after-details.png' });

      const instanceModal = await page.locator('.instance-info-modal, [role="dialog"]:has-text("Instance")').isVisible({ timeout: 1000 }).catch(() => false);
      console.log('    Instance info modal opened:', instanceModal);

      if (instanceModal) {
        await page.keyboard.press('Escape');
        await sleep(500);
      }
    } else {
      console.log('    View Details button not visible');
    }

    // 10. Test Switch Model button
    console.log('10. Testing Switch Model button...');
    const switchModelBtn = page.locator('.inline-tool-switch-model-btn, button:has-text("Switch Model")').first();
    if (await switchModelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   Clicking Switch Model...');
      await switchModelBtn.click();
      await sleep(1500);
      await page.screenshot({ path: 'test-screenshots/stall-10-after-switch.png' });

      const modalOpen = await page.locator('.model-selector-modal, [role="dialog"]:has-text("Select Model")').isVisible({ timeout: 1000 }).catch(() => false);
      console.log('   Model selector modal opened:', modalOpen);

      if (modalOpen) {
        await page.keyboard.press('Escape');
        await sleep(500);
      }
    } else {
      console.log('   Switch Model button not visible');
    }

    // Print relevant console logs
    console.log('\n=== Relevant Console Logs ===');
    const relevant = consoleLogs.filter(l =>
      l.includes('[InlineToolCall]') ||
      l.includes('[ui-actions]') ||
      l.includes('[App]')
    );
    if (relevant.length === 0) {
      console.log('(No button click logs captured)');
    } else {
      relevant.forEach(l => console.log(l));
    }

    await page.screenshot({ path: 'test-screenshots/stall-10-final.png' });
    console.log('\n=== Test completed ===');

  } catch (error) {
    console.error('\nTest error:', error.message);
    await page.screenshot({ path: 'test-screenshots/stall-error.png' });
  } finally {
    console.log('\nBrowser closing in 5 seconds...');
    await sleep(5000);
    await browser.close();
  }
}

testStallButtons().catch(console.error);
