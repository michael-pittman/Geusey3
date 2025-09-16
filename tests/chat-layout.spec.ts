import { test, expect } from '@playwright/test';

test.describe('Chat Container Layout', () => {
  test('chat container layout matches screenshot with proper spacing', async ({ page }) => {
    await page.goto('/');
    
    // Open chat to reveal the interface
    await page.locator('img[src*="glitch.gif"], img[src*="fire.gif"]').click();
    await page.locator('.chat-container.visible').waitFor();
    
    // Wait for suggestions to appear
    await page.locator('.chat-suggestions').waitFor();
    
    // Set viewport to iPhone SE dimensions to match screenshot
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Force dark mode to match screenshot
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-force-dark', 'true');
    });
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
    
    // Take a screenshot of the chat container
    await page.screenshot({ 
      path: 'test-results/chat-layout-verification.png',
      fullPage: false
    });
    
    // Verify chat container is visible
    const chatContainer = page.locator('.chat-container.visible');
    await expect(chatContainer).toBeVisible();
    
    // Verify chat messages area has proper spacing
    const chatMessages = page.locator('.chat-messages');
    await expect(chatMessages).toBeVisible();
    
    // Check that chat messages has the correct margin
    const messagesMargin = await chatMessages.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight
      };
    });
    
    // Verify the margin values match our updated CSS
    // When suggestions are visible, margin-bottom should be 135px due to .has-suggestions rule
    expect(messagesMargin.marginBottom).toBe('135px');
    expect(messagesMargin.marginLeft).toBe('12px');
    expect(messagesMargin.marginRight).toBe('12px');
    
    // Verify suggestions are positioned correctly
    const suggestions = page.locator('.chat-suggestions');
    await expect(suggestions).toBeVisible();
    
    // Check suggestions positioning
    const suggestionsPosition = await suggestions.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        position: style.position,
        bottom: style.bottom,
        left: style.left,
        right: style.right
      };
    });
    
    expect(suggestionsPosition.position).toBe('absolute');
    expect(suggestionsPosition.bottom).toBe('100px');
    expect(suggestionsPosition.left).toBe('16px');
    expect(suggestionsPosition.right).toBe('16px');
    
    // Verify suggestions have no padding (removed as requested)
    const suggestionsPadding = await suggestions.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight
      };
    });
    
    expect(suggestionsPadding.paddingTop).toBe('0px');
    expect(suggestionsPadding.paddingBottom).toBe('0px');
    expect(suggestionsPadding.paddingLeft).toBe('0px');
    expect(suggestionsPadding.paddingRight).toBe('0px');
    
    // Verify suggestions gap
    const suggestionsGap = await suggestions.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.gap;
    });
    
    expect(suggestionsGap).toBe('8px');
    
    // Verify chat messages padding
    const messagesPadding = await chatMessages.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight
      };
    });
    
    expect(messagesPadding.paddingTop).toBe('20px');
    expect(messagesPadding.paddingBottom).toBe('20px');
    expect(messagesPadding.paddingLeft).toBe('20px');
    expect(messagesPadding.paddingRight).toBe('20px');
  });

  test('chat messages margin when suggestions are hidden', async ({ page }) => {
    await page.goto('/');
    
    // Open chat to reveal the interface
    await page.locator('img[src*="glitch.gif"], img[src*="fire.gif"]').click();
    await page.locator('.chat-container.visible').waitFor();
    
    // Wait for suggestions to appear initially
    await page.locator('.chat-suggestions').waitFor();
    
    // Hide suggestions by sending a message (this should trigger hideSuggestions)
    await page.locator('.chat-input').fill('test message');
    await page.locator('.chat-send').click();
    
    // Wait for suggestions to be hidden
    await page.waitForTimeout(500);
    
    // Set viewport to iPhone SE dimensions
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Force dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-force-dark', 'true');
    });
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
    
    // Verify chat messages area has proper spacing when suggestions are hidden
    const chatMessages = page.locator('.chat-messages');
    await expect(chatMessages).toBeVisible();
    
    // Check that chat messages has the correct margin when suggestions are hidden
    const messagesMargin = await chatMessages.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight
      };
    });
    
    // When suggestions are hidden, margin-bottom should be 95px (default state)
    expect(messagesMargin.marginBottom).toBe('95px');
    expect(messagesMargin.marginLeft).toBe('12px');
    expect(messagesMargin.marginRight).toBe('12px');
    
    // Verify suggestions are hidden
    const suggestions = page.locator('.chat-suggestions');
    await expect(suggestions).toBeHidden();
  });
});
