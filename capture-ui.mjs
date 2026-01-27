import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Navigate to the app
await page.goto('http://localhost:3000');
await page.waitForTimeout(2000);

// Take screenshot of folder selection
await page.screenshot({ path: '/tmp/ui-folder-selection.png', fullPage: true });

// Click on CodeNomad folder to open it
const folderItem = page.locator('text=CodeNomad').first();
if (await folderItem.count() > 0) {
  await folderItem.click();
  await page.waitForTimeout(4000);
  
  // Take screenshot of main view
  await page.screenshot({ path: '/tmp/ui-main-view.png', fullPage: true });
  
  // Press Cmd+, to open settings
  await page.keyboard.press('Meta+,');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/ui-settings-panel.png', fullPage: true });
}

await browser.close();
console.log('Screenshots captured!');
