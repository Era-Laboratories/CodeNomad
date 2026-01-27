import { chromium } from 'playwright';
import fs from 'fs';

const screenshotDir = './test-screenshots/ui-review';

async function run() {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click on the project tab to activate it
  const projectTab = await page.$('.project-tab');
  if (projectTab) {
    console.log('Clicking project tab...');
    await projectTab.click();
    await page.waitForTimeout(2000);
  }

  // Take screenshot of session selection view
  await page.screenshot({ path: `${screenshotDir}/01-session-selection.png` });
  console.log('Captured: 01-session-selection.png');

  // TEST 1: Click the port button (:4096) to test Instance Info Modal
  const portBtn = await page.$('.bottom-status-instance');
  if (portBtn) {
    console.log('Clicking port button for Instance Info Modal...');
    await portBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotDir}/02-instance-modal.png` });
    console.log('Captured: 02-instance-modal.png');

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    console.log('Port button not found');
  }

  // TEST 2: Click MCP button to test MCP Settings Modal
  const mcpBtn = await page.$('.bottom-status-mcp');
  if (mcpBtn) {
    console.log('Clicking MCP button...');
    await mcpBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotDir}/03-mcp-settings.png` });
    console.log('Captured: 03-mcp-settings.png');

    // Look for Add Server button
    const addServerBtn = await page.$('button:has-text("Add Server")');
    if (addServerBtn) {
      console.log('Clicking Add Server button...');
      await addServerBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${screenshotDir}/04-add-server-modal.png` });
      console.log('Captured: 04-add-server-modal.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Close MCP modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // TEST 3: Click settings button to verify it opens Quick Settings (not Instance Modal)
  const settingsBtn = await page.$('.bottom-status-settings');
  if (settingsBtn) {
    console.log('Clicking settings button...');
    await settingsBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotDir}/05-settings-panel.png` });
    console.log('Captured: 05-settings-panel.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // TEST 4: Resume session to see the full interface with right sidebar
  const sessionItem = await page.$('.panel-list-item');
  if (sessionItem) {
    console.log('Clicking to resume session...');
    await sessionItem.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${screenshotDir}/06-active-session.png` });
    console.log('Captured: 06-active-session.png');

    // Now check for right sidebar with collapsible sections
    const controlPanelSections = await page.$$('.control-panel-section');
    console.log('Control panel sections found:', controlPanelSections.length);

    // Take screenshot of full UI with active session
    await page.screenshot({ path: `${screenshotDir}/07-full-session-view.png`, fullPage: true });
    console.log('Captured: 07-full-session-view.png');

    // Test the port button again in session view
    const portBtn2 = await page.$('.bottom-status-instance');
    if (portBtn2) {
      console.log('Clicking port button in session view...');
      await portBtn2.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${screenshotDir}/08-instance-modal-session.png` });
      console.log('Captured: 08-instance-modal-session.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // Close-up of bottom bar
  const bottomBar = await page.$('.bottom-status-bar');
  if (bottomBar) {
    const box = await bottomBar.boundingBox();
    if (box) {
      await page.screenshot({
        path: `${screenshotDir}/09-bottom-bar-closeup.png`,
        clip: { x: 0, y: box.y - 20, width: 1400, height: box.height + 40 }
      });
      console.log('Captured: 09-bottom-bar-closeup.png');
    }
  }

  await page.screenshot({ path: `${screenshotDir}/10-final.png` });
  console.log('Captured: 10-final.png');

  await browser.close();
  console.log('\nAll screenshots saved to:', screenshotDir);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
