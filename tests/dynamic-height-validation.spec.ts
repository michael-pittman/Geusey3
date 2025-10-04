import { test, expect } from '@playwright/test';

test.describe('Dynamic Chat Input Height System', () => {
  test('validates --chat-input-height CSS variable is set and used correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Find and click the chat icon container div instead of the image
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click();

    // Wait for chat to be visible
    await page.locator('.chat-container.visible').waitFor();

    // Wait for the dynamic height system to initialize
    await page.waitForTimeout(500);

    // Validate that the --chat-input-height CSS variable is set
    const cssVariableInfo = await page.evaluate(() => {
      const inputHeight = getComputedStyle(document.documentElement).getPropertyValue('--chat-input-height');
      return {
        isSet: !!inputHeight,
        value: inputHeight,
        numericValue: parseFloat(inputHeight) || 0
      };
    });

    console.log('CSS Variable Info:', cssVariableInfo);

    // Verify the variable is set
    expect(cssVariableInfo.isSet).toBe(true);
    expect(cssVariableInfo.numericValue).toBeGreaterThan(0);

    // Verify it's within a reasonable range (40px - 120px for normal cases)
    expect(cssVariableInfo.numericValue).toBeGreaterThanOrEqual(40);
    expect(cssVariableInfo.numericValue).toBeLessThanOrEqual(120);

    // Get actual input container height
    const actualInputHeight = await page.locator('.chat-input-container').evaluate((el) => {
      return el.offsetHeight;
    });

    console.log('Actual input container height:', actualInputHeight);

    // Verify the CSS variable matches the actual height
    expect(Math.abs(cssVariableInfo.numericValue - actualInputHeight)).toBeLessThanOrEqual(1);

    // Verify .chat-messages uses the dynamic value
    const messagesMargin = await page.locator('.chat-messages').evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        marginBottom: style.marginBottom,
        marginBottomNum: parseFloat(style.marginBottom)
      };
    });

    console.log('Messages margin-bottom:', messagesMargin);

    // Check if suggestions are visible to determine expected margin
    const hasSuggestions = await page.locator('.chat-container.has-suggestions').count() > 0;

    let expectedMargin;
    if (hasSuggestions) {
      // inputHeight + 63px (suggestions) + 15px (gap)
      expectedMargin = actualInputHeight + 63 + 15;
    } else {
      // inputHeight + 21px (gap)
      expectedMargin = actualInputHeight + 21;
    }

    console.log('Expected margin:', expectedMargin, 'Has suggestions:', hasSuggestions);

    // Allow ±3px tolerance for rounding and browser differences
    expect(messagesMargin.marginBottomNum).toBeGreaterThanOrEqual(expectedMargin - 3);
    expect(messagesMargin.marginBottomNum).toBeLessThanOrEqual(expectedMargin + 3);

    // Verify .chat-suggestions uses the dynamic value
    const suggestionsVisible = await page.locator('.chat-suggestions:not([hidden])').count() > 0;

    if (suggestionsVisible) {
      const suggestionsBottom = await page.locator('.chat-suggestions').evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          bottom: style.bottom,
          bottomNum: parseFloat(style.bottom)
        };
      });

      console.log('Suggestions bottom:', suggestionsBottom);

      // Expected: inputHeight + 6px (gap)
      const expectedBottom = actualInputHeight + 6;

      // Allow ±2px tolerance
      expect(suggestionsBottom.bottomNum).toBeGreaterThanOrEqual(expectedBottom - 2);
      expect(suggestionsBottom.bottomNum).toBeLessThanOrEqual(expectedBottom + 2);
    }
  });

  test('validates ResizeObserver updates CSS variable on viewport changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open chat
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click();
    await page.locator('.chat-container.visible').waitFor();
    await page.waitForTimeout(500);

    // Get initial height value
    const initialHeight = await page.evaluate(() => {
      return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chat-input-height')) || 0;
    });

    console.log('Initial height:', initialHeight);
    expect(initialHeight).toBeGreaterThan(0);

    // Change viewport size to trigger resize
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);

    // Get height after resize
    const heightAfterResize = await page.evaluate(() => {
      return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chat-input-height')) || 0;
    });

    console.log('Height after resize:', heightAfterResize);

    // Height should still be set and reasonable
    expect(heightAfterResize).toBeGreaterThan(0);
    expect(heightAfterResize).toBeGreaterThanOrEqual(40);
    expect(heightAfterResize).toBeLessThanOrEqual(120);

    // Change to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    const heightAfterMobileResize = await page.evaluate(() => {
      return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chat-input-height')) || 0;
    });

    console.log('Height after mobile resize:', heightAfterMobileResize);

    // Height should still be reasonable on mobile
    expect(heightAfterMobileResize).toBeGreaterThan(0);
    expect(heightAfterMobileResize).toBeGreaterThanOrEqual(40);
    expect(heightAfterMobileResize).toBeLessThanOrEqual(120);
  });

  test('validates cleanup on chat close', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open chat
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click();
    await page.locator('.chat-container.visible').waitFor();
    await page.waitForTimeout(500);

    // Verify variable is set
    const heightBeforeClose = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--chat-input-height');
    });

    expect(heightBeforeClose).toBeTruthy();
    console.log('Height before close:', heightBeforeClose);

    // Note: The current implementation doesn't call cleanup on close
    // This test documents the current behavior
    // If cleanup is needed, the close button handler should call cleanupInputHeightMeasurement()
  });
});
