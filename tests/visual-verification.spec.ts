import { test, expect } from '@playwright/test';

test.describe('Visual Verification of Chat Suggestion Fix', () => {
  test('Visual verification with screenshots', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Take initial screenshot
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/01-initial-page.png',
      fullPage: true
    });

    // Open chat interface
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click({ force: true });
    await page.locator('.chat-container.visible').waitFor();

    // Take screenshot of opened chat with suggestions
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/02-chat-with-suggestions.png',
      fullPage: true
    });

    // Click on "Create a SaaS MVP" suggestion
    const targetChip = page.locator('.chat-suggestions .chip').filter({ hasText: 'Create a SaaS MVP' });
    await targetChip.click();

    // Wait for message to appear
    await page.waitForTimeout(2000);

    // Take screenshot after clicking suggestion
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/03-after-suggestion-click.png',
      fullPage: true
    });

    // Verify the message is visible
    const userMessages = page.locator('.message.user');
    await expect(userMessages.last()).toContainText('Create a SaaS MVP');

    // Test manual typing
    const chatInput = page.locator('.chat-input');
    const sendButton = page.locator('.chat-send');

    await chatInput.fill('This is a manual test message');
    await sendButton.click();
    await page.waitForTimeout(2000);

    // Take final screenshot showing both messages
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/04-both-messages.png',
      fullPage: true
    });

    console.log('✅ Visual verification complete. Screenshots saved to test-results/');
  });
});