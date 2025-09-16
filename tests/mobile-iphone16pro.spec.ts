import { test, expect } from '@playwright/test';

test.describe('iPhone 16 Pro Mobile Responsiveness - Critical Issues Verification', () => {
  // iPhone 16 Pro with iOS 18 viewport dimensions
  const IPHONE_16_PRO_VIEWPORT = { width: 430, height: 932 };

  test.beforeEach(async ({ page }) => {
    // Set iPhone 16 Pro viewport
    await page.setViewportSize(IPHONE_16_PRO_VIEWPORT);
    
    // Simulate mobile user agent for iOS 18
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    });
    
    await page.goto('/');
  });

  test('Critical Issue 1: Theme-color meta tag changes from pink to dark', async ({ page }) => {
    // Check initial theme-color meta tag (should be pink/light)
    const initialThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag ? metaTag.getAttribute('content') : null;
    });
    
    console.log('Initial theme-color:', initialThemeColor);
    
    // Open chat to access theme toggle
    await page.locator('img[src*="glitch.gif"], img[src*="fire.gif"]').click();
    await page.locator('.chat-container.visible').waitFor();
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-results/iphone16pro-initial-theme.png',
      fullPage: true
    });
    
    // Check current theme
    const currentTheme = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme')
    );
    
    if (currentTheme === 'light') {
      // Verify light theme has pink theme-color
      expect(initialThemeColor).toBe('#edcfcf');
    } else {
      // Verify dark theme has dark theme-color
      expect(initialThemeColor).toBe('#141416');
    }
    
    // Toggle theme
    const toggle = page.getByRole('button', { name: /toggle dark mode/i });
    await toggle.click();
    
    // Wait for theme change to complete
    await page.waitForTimeout(500);
    
    // Check theme-color meta tag after toggle
    const newThemeColor = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="theme-color"]');
      return metaTag ? metaTag.getAttribute('content') : null;
    });
    
    const newTheme = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme')
    );
    
    console.log('New theme:', newTheme, 'New theme-color:', newThemeColor);
    
    // Verify theme-color matches new theme
    if (newTheme === 'dark') {
      expect(newThemeColor).toBe('#141416');
    } else {
      expect(newThemeColor).toBe('#edcfcf');
    }
    
    // Take screenshot after theme toggle
    await page.screenshot({ 
      path: 'test-results/iphone16pro-toggled-theme.png',
      fullPage: true
    });
    
    // Verify the theme-color actually changed
    expect(newThemeColor).not.toBe(initialThemeColor);
  });

  test('Critical Issue 2: Chat icon floating in viewport without scroll', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/iphone16pro-chat-icon-positioning.png',
      fullPage: false
    });
    
    // Check if chat icon is visible without scrolling
    const chatIcon = page.locator('img[src*="glitch.gif"], img[src*="fire.gif"]');
    await expect(chatIcon).toBeVisible();
    
    // Get chat icon position
    const iconPosition = await chatIcon.boundingBox();
    expect(iconPosition).not.toBeNull();
    
    // Verify icon is within viewport bounds
    expect(iconPosition!.x).toBeGreaterThanOrEqual(0);
    expect(iconPosition!.y).toBeGreaterThanOrEqual(0);
    expect(iconPosition!.x + iconPosition!.width).toBeLessThanOrEqual(IPHONE_16_PRO_VIEWPORT.width);
    expect(iconPosition!.y + iconPosition!.height).toBeLessThanOrEqual(IPHONE_16_PRO_VIEWPORT.height);
    
    // Check if icon is positioned as fixed or absolute
    const iconStyles = await chatIcon.evaluate((el) => {
      const style = getComputedStyle(el.parentElement || el);
      return {
        position: style.position,
        bottom: style.bottom,
        right: style.right,
        zIndex: style.zIndex
      };
    });
    
    console.log('Chat icon positioning:', iconStyles);
    
    // Verify icon is positioned to float in viewport
    expect(['fixed', 'absolute']).toContain(iconStyles.position);
    
    // Try scrolling to see if icon remains visible
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);
    
    // Icon should still be visible after scroll
    await expect(chatIcon).toBeVisible();
    
    // Reset scroll position
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  test('Critical Issue 3: Three.js scene covers entire viewport including safe areas', async ({ page }) => {
    // Get viewport and canvas dimensions
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      if (!canvas) return { viewport, canvas: null };
      
      const canvasRect = canvas.getBoundingClientRect();
      const canvasStyle = getComputedStyle(canvas);
      
      return {
        viewport,
        canvas: {
          width: canvasRect.width,
          height: canvasRect.height,
          top: canvasRect.top,
          left: canvasRect.left,
          position: canvasStyle.position,
          zIndex: canvasStyle.zIndex
        }
      };
    });
    
    console.log('Canvas and viewport info:', canvasInfo);
    
    // Verify canvas exists
    expect(canvasInfo.canvas).not.toBeNull();
    
    // Verify canvas covers entire viewport
    expect(canvasInfo.canvas!.width).toBe(IPHONE_16_PRO_VIEWPORT.width);
    expect(canvasInfo.canvas!.height).toBe(IPHONE_16_PRO_VIEWPORT.height);
    expect(canvasInfo.canvas!.top).toBe(0);
    expect(canvasInfo.canvas!.left).toBe(0);
    
    // Take screenshot to verify visual coverage
    await page.screenshot({ 
      path: 'test-results/iphone16pro-threejs-coverage.png',
      fullPage: false
    });
    
    // Check if Three.js scene is behind other content (lower z-index)
    expect(parseInt(canvasInfo.canvas!.zIndex) || 0).toBeLessThan(10);
    
    // Verify no content appears below Three.js scene by checking body height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    expect(bodyHeight).toBeLessThanOrEqual(IPHONE_16_PRO_VIEWPORT.height + 50); // Allow small margin
  });

  test('Theme toggle functionality on mobile', async ({ page }) => {
    // Open chat
    await page.locator('img[src*="glitch.gif"], img[src*="fire.gif"]').click();
    await page.locator('.chat-container.visible').waitFor();
    
    // Test theme toggle with touch interaction
    const toggle = page.getByRole('button', { name: /toggle dark mode/i });
    await expect(toggle).toBeVisible();
    
    // Get initial theme
    const initialTheme = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme')
    );
    
    // Simulate touch tap on toggle
    await toggle.tap();
    await page.waitForTimeout(500);
    
    // Verify theme changed
    const newTheme = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme')
    );
    expect(newTheme).not.toBe(initialTheme);
    
    // Take screenshot of theme change
    await page.screenshot({ 
      path: 'test-results/iphone16pro-theme-toggle-mobile.png',
      fullPage: true
    });
  });

  test('Mobile touch interactions work properly', async ({ page }) => {
    // Test chat icon tap
    const chatIcon = page.locator('img[src*="glitch.gif"], img[src*="fire.gif"]');
    await chatIcon.tap();
    await page.locator('.chat-container.visible').waitFor();
    
    // Test close button tap
    const closeButton = page.getByRole('button', { name: /close chat/i });
    await closeButton.tap();
    await page.locator('.chat-container').waitFor({ state: 'hidden' });
    
    // Test Three.js canvas touch interaction (should not interfere)
    const canvas = page.locator('canvas');
    await canvas.tap();
    
    // Verify chat remains closed after canvas tap
    await expect(page.locator('.chat-container.visible')).toHaveCount(0);
    
    // Test reopening chat after canvas interaction
    await chatIcon.tap();
    await page.locator('.chat-container.visible').waitFor();
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/iphone16pro-touch-interactions.png',
      fullPage: true
    });
  });

  test('Safe area considerations for iPhone 16 Pro', async ({ page }) => {
    // Check CSS custom properties for safe areas
    const safeAreaInfo = await page.evaluate(() => {
      const computedStyle = getComputedStyle(document.documentElement);
      return {
        safeAreaInsetTop: computedStyle.getPropertyValue('--safe-area-inset-top') || 
                         computedStyle.getPropertyValue('env(safe-area-inset-top)'),
        safeAreaInsetBottom: computedStyle.getPropertyValue('--safe-area-inset-bottom') || 
                            computedStyle.getPropertyValue('env(safe-area-inset-bottom)'),
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.clientHeight
      };
    });
    
    console.log('Safe area info:', safeAreaInfo);
    
    // Verify chat container respects safe areas
    await page.locator('img[src*="glitch.gif"], img[src*="fire.gif"]').tap();
    await page.locator('.chat-container.visible').waitFor();
    
    const chatContainerPosition = await page.locator('.chat-container').evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        top: rect.top,
        bottom: rect.bottom,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom
      };
    });
    
    console.log('Chat container position:', chatContainerPosition);
    
    // Take screenshot for manual verification
    await page.screenshot({ 
      path: 'test-results/iphone16pro-safe-areas.png',
      fullPage: true
    });
  });
});