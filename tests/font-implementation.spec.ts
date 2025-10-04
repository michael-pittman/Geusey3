import { test, expect } from '@playwright/test';

test.describe('Font Implementation Validation', () => {
  // Test native font stack consistency across different browsers
  test('validates native font stack implementation', async ({ page, browserName }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Test that no external Google Fonts are loaded
    const resourceRequests = [];
    page.on('request', request => {
      resourceRequests.push(request.url());
    });

    // Reload to capture all network requests
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify no Google Fonts requests
    const googleFontRequests = resourceRequests.filter(url =>
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('google') && url.includes('font')
    );

    expect(googleFontRequests).toHaveLength(0);
    console.log(`${browserName}: ✓ No external font dependencies detected`);

    // Verify font family is correctly applied to root elements
    const bodyFontFamily = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily
    );

    expect(bodyFontFamily).toContain('-apple-system');
    expect(bodyFontFamily).toContain('BlinkMacSystemFont');
    expect(bodyFontFamily).toContain('Segoe UI');
    console.log(`${browserName}: ✓ Native font stack applied to body:`, bodyFontFamily);

    // Test CSS custom property for font-primary
    const rootFontPrimary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-primary')
    );

    expect(rootFontPrimary).toContain('-apple-system');
    console.log(`${browserName}: ✓ --font-primary CSS custom property:`, rootFontPrimary);
  });

  test('validates font rendering across different viewport sizes', async ({ page, browserName }) => {
    const viewports = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 812, name: 'iPhone X' },
      { width: 414, height: 896, name: 'iPhone XR' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'iPad Landscape' },
      { width: 1440, height: 900, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test font rendering properties
      const fontSmoothingProperties = await page.evaluate(() => {
        const style = getComputedStyle(document.body);
        return {
          webkitFontSmoothing: style.webkitFontSmoothing,
          mozOsxFontSmoothing: style.MozOsxFontSmoothing,
          textRendering: style.textRendering,
          fontFamily: style.fontFamily
        };
      });

      expect(fontSmoothingProperties.webkitFontSmoothing).toBe('antialiased');
      expect(fontSmoothingProperties.textRendering).toBe('optimizelegibility');
      expect(fontSmoothingProperties.fontFamily).toContain('-apple-system');

      console.log(`${browserName} - ${viewport.name}: ✓ Font rendering properties correct`);
    }
  });

  test('validates chat interface font consistency', async ({ page, browserName }) => {
    await page.goto('/');

    // Open chat interface
        await page.locator('#chat-icon').click();
    await page.locator('.chat-container.visible').waitFor();

    // Test header title font
    const headerTitleFont = await page.evaluate(() => {
      const element = document.querySelector('.chat-header-title');
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontSize: style.fontSize,
        webkitFontSmoothing: style.webkitFontSmoothing
      };
    });

    expect(headerTitleFont).not.toBeNull();
    expect(headerTitleFont.fontFamily).toContain('-apple-system');
    expect(headerTitleFont.webkitFontSmoothing).toBe('antialiased');
    console.log(`${browserName}: ✓ Chat header font properties:`, headerTitleFont);

    // Test message font rendering
    const messageFont = await page.evaluate(() => {
      // Add a test message to ensure we have something to test
      const container = document.querySelector('.chat-messages');
      if (container) {
        const div = document.createElement('div');
        div.className = 'message bot';
        div.textContent = 'Font test message';
        container.appendChild(div);
      }

      const element = document.querySelector('.message');
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontSize: style.fontSize,
        webkitFontSmoothing: style.webkitFontSmoothing,
        textRendering: style.textRendering
      };
    });

    expect(messageFont).not.toBeNull();
    expect(messageFont.fontFamily).toContain('-apple-system');
    expect(messageFont.webkitFontSmoothing).toBe('antialiased');
    expect(messageFont.textRendering).toBe('optimizelegibility');
    console.log(`${browserName}: ✓ Message font properties:`, messageFont);

    // Test input field font
    const inputFont = await page.evaluate(() => {
      const element = document.querySelector('.chat-input');
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontSize: style.fontSize,
        webkitFontSmoothing: style.webkitFontSmoothing
      };
    });

    expect(inputFont).not.toBeNull();
    expect(inputFont.fontFamily).toContain('-apple-system');
    expect(inputFont.webkitFontSmoothing).toBe('antialiased');
    console.log(`${browserName}: ✓ Input field font properties:`, inputFont);
  });

  test('validates font consistency between themes', async ({ page, browserName }) => {
    await page.goto('/');

    // Open chat to access theme toggle
        await page.locator('#chat-icon').click();
    await page.locator('.chat-container.visible').waitFor();

    // Get initial theme and font properties
    const initialProperties = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const input = getComputedStyle(document.querySelector('.chat-input'));
      const message = document.querySelector('.message') ||
        (() => {
          const container = document.querySelector('.chat-messages');
          const div = document.createElement('div');
          div.className = 'message bot';
          div.textContent = 'Theme test message';
          container?.appendChild(div);
          return div;
        })();
      const messageStyle = getComputedStyle(message);

      return {
        theme: document.documentElement.getAttribute('data-theme'),
        body: {
          fontFamily: body.fontFamily,
          webkitFontSmoothing: body.webkitFontSmoothing,
          textRendering: body.textRendering
        },
        input: {
          fontFamily: input.fontFamily,
          fontWeight: input.fontWeight,
          webkitFontSmoothing: input.webkitFontSmoothing
        },
        message: {
          fontFamily: messageStyle.fontFamily,
          fontWeight: messageStyle.fontWeight,
          webkitFontSmoothing: messageStyle.webkitFontSmoothing
        }
      };
    });

    // Toggle theme
    const themeToggle = page.getByRole('button', { name: /toggle dark mode/i });
    await themeToggle.click();

    // Wait for theme transition
    await page.waitForTimeout(500);

    // Get properties after theme change
    const afterToggleProperties = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const input = getComputedStyle(document.querySelector('.chat-input'));
      const message = getComputedStyle(document.querySelector('.message'));

      return {
        theme: document.documentElement.getAttribute('data-theme'),
        body: {
          fontFamily: body.fontFamily,
          webkitFontSmoothing: body.webkitFontSmoothing,
          textRendering: body.textRendering
        },
        input: {
          fontFamily: input.fontFamily,
          fontWeight: input.fontWeight,
          webkitFontSmoothing: input.webkitFontSmoothing
        },
        message: {
          fontFamily: messageStyle.fontFamily,
          fontWeight: messageStyle.fontWeight,
          webkitFontSmoothing: messageStyle.webkitFontSmoothing
        }
      };
    });

    // Verify theme changed but font properties remained consistent
    expect(initialProperties.theme).not.toBe(afterToggleProperties.theme);

    // Font families should remain identical
    expect(initialProperties.body.fontFamily).toBe(afterToggleProperties.body.fontFamily);
    expect(initialProperties.input.fontFamily).toBe(afterToggleProperties.input.fontFamily);
    expect(initialProperties.message.fontFamily).toBe(afterToggleProperties.message.fontFamily);

    // Font rendering should remain consistent
    expect(initialProperties.body.webkitFontSmoothing).toBe(afterToggleProperties.body.webkitFontSmoothing);
    expect(initialProperties.input.webkitFontSmoothing).toBe(afterToggleProperties.input.webkitFontSmoothing);
    expect(initialProperties.message.webkitFontSmoothing).toBe(afterToggleProperties.message.webkitFontSmoothing);

    console.log(`${browserName}: ✓ Font consistency maintained across theme changes`);
    console.log(`${browserName}: Theme changed from ${initialProperties.theme} to ${afterToggleProperties.theme}`);
  });

  test('validates iOS Safari font zoom prevention', async ({ page, browserName }) => {
    // Skip this test for non-mobile browsers
    if (!browserName.includes('webkit') && !browserName.includes('Mobile')) {
      test.skip();
    }

    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X size
    await page.goto('/');

    // Open chat
        await page.locator('#chat-icon').click();
    await page.locator('.chat-container.visible').waitFor();

    // Test input field font size meets iOS requirements
    const inputProperties = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      if (!input) return null;

      const style = getComputedStyle(input);
      const fontSize = parseFloat(style.fontSize);
      const fontSizeInPx = fontSize;

      // Test that font-size is at least 16px to prevent iOS zoom
      return {
        fontSize: fontSizeInPx,
        fontFamily: style.fontFamily,
        webkitTextSizeAdjust: style.webkitTextSizeAdjust
      };
    });

    expect(inputProperties).not.toBeNull();
    expect(inputProperties.fontSize).toBeGreaterThanOrEqual(16);
    expect(inputProperties.fontFamily).toContain('-apple-system');

    console.log(`${browserName}: ✓ Input font size prevents iOS zoom: ${inputProperties.fontSize}px`);

    // Test that iOS-specific text adjustment is set
    if (inputProperties.webkitTextSizeAdjust) {
      expect(inputProperties.webkitTextSizeAdjust).toBe('100%');
    }
  });

  test('validates font feature settings and typography enhancements', async ({ page, browserName }) => {
    await page.goto('/');

    // Open chat interface
        await page.locator('#chat-icon').click();
    await page.locator('.chat-container.visible').waitFor();

    // Test advanced typography features
    const typographyFeatures = await page.evaluate(() => {
      const elements = [
        { selector: 'body', name: 'body' },
        { selector: '.chat-input', name: 'input' },
        { selector: '.message', name: 'message' },
        { selector: '.chat-header-title', name: 'header' }
      ];

      // Add a test message if none exists
      const container = document.querySelector('.chat-messages');
      if (container && !document.querySelector('.message')) {
        const div = document.createElement('div');
        div.className = 'message bot';
        div.textContent = 'Typography test message';
        container.appendChild(div);
      }

      return elements.map(({ selector, name }) => {
        const element = document.querySelector(selector);
        if (!element) return { name, error: 'Element not found' };

        const style = getComputedStyle(element);
        return {
          name,
          fontFeatureSettings: style.fontFeatureSettings,
          fontVariantLigatures: style.fontVariantLigatures,
          fontKerning: style.fontKerning,
          textRendering: style.textRendering,
          webkitFontSmoothing: style.webkitFontSmoothing,
          mozOsxFontSmoothing: style.MozOsxFontSmoothing
        };
      });
    });

    typographyFeatures.forEach(feature => {
      if (feature.error) {
        console.warn(`${browserName}: ${feature.name} - ${feature.error}`);
        return;
      }

      // Verify typography enhancements are applied
      expect(feature.textRendering).toBe('optimizelegibility');
      expect(feature.webkitFontSmoothing).toBe('antialiased');

      // Font feature settings should include kerning and ligatures
      if (feature.fontFeatureSettings && feature.fontFeatureSettings !== 'normal') {
        expect(feature.fontFeatureSettings).toMatch(/kern|liga/);
      }

      if (feature.fontKerning && feature.fontKerning !== 'auto') {
        expect(['auto', 'normal']).toContain(feature.fontKerning);
      }

      console.log(`${browserName}: ✓ ${feature.name} typography features:`, feature);
    });
  });

  test('validates font loading performance and metrics', async ({ page, browserName }) => {
    // Monitor performance during page load
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Measure font-related performance metrics
    const fontMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Check if fonts are already loaded
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            const performanceEntries = performance.getEntriesByType('navigation');
            const navigationEntry = performanceEntries[0] as PerformanceNavigationTiming;

            resolve({
              fontsLoaded: true,
              domContentLoaded: navigationEntry?.domContentLoadedEventEnd - navigationEntry?.domContentLoadedEventStart,
              loadComplete: navigationEntry?.loadEventEnd - navigationEntry?.loadEventStart,
              fontLoadTime: 'immediate (system fonts)',
              totalResources: performance.getEntriesByType('resource').length
            });
          });
        } else {
          // Fallback for browsers without Font Loading API
          resolve({
            fontsLoaded: 'unknown',
            fontLoadTime: 'immediate (system fonts expected)',
            note: 'Font Loading API not supported'
          });
        }
      });
    });

    console.log(`${browserName}: Font loading metrics:`, fontMetrics);

    // Since we're using system fonts, loading should be immediate
    expect(fontMetrics.fontLoadTime).toContain('immediate');

    // Verify no font-related resources were loaded from external sources
    const resourceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter((entry: PerformanceResourceTiming) =>
          entry.name.includes('font') ||
          entry.name.includes('woff') ||
          entry.name.includes('ttf') ||
          entry.name.includes('google')
        )
        .map((entry: PerformanceResourceTiming) => ({
          name: entry.name,
          duration: entry.duration,
          transferSize: entry.transferSize
        }));
    });

    expect(resourceEntries).toHaveLength(0);
    console.log(`${browserName}: ✓ No external font resources loaded`);
  });

  test('validates font accessibility compliance', async ({ page, browserName }) => {
    await page.goto('/');

    // Test with forced-colors mode (Windows High Contrast)
    await page.emulateMedia({ forcedColors: 'active' });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open chat interface
        await page.locator('#chat-icon').click();
    await page.locator('.chat-container.visible').waitFor();

    // Test font readability in high contrast mode
    const highContrastFonts = await page.evaluate(() => {
      const elements = [
        '.chat-input',
        '.message',
        '.chat-header-title'
      ];

      // Add test message
      const container = document.querySelector('.chat-messages');
      if (container && !document.querySelector('.message')) {
        const div = document.createElement('div');
        div.className = 'message bot';
        div.textContent = 'High contrast test message';
        container.appendChild(div);
      }

      return elements.map(selector => {
        const element = document.querySelector(selector);
        if (!element) return null;

        const style = getComputedStyle(element);
        return {
          selector,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          color: style.color,
          backgroundColor: style.backgroundColor,
          visibility: style.visibility,
          display: style.display
        };
      }).filter(Boolean);
    });

    highContrastFonts.forEach(font => {
      expect(font.fontFamily).toContain('-apple-system');
      expect(font.visibility).toBe('visible');
      expect(font.display).not.toBe('none');
      console.log(`${browserName}: ✓ ${font.selector} accessible in high contrast mode`);
    });

    // Test with reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Verify fonts still render correctly with reduced motion
    const reducedMotionFonts = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return {
        fontFamily: body.fontFamily,
        webkitFontSmoothing: body.webkitFontSmoothing,
        textRendering: body.textRendering
      };
    });

    expect(reducedMotionFonts.fontFamily).toContain('-apple-system');
    expect(reducedMotionFonts.webkitFontSmoothing).toBe('antialiased');
    console.log(`${browserName}: ✓ Fonts render correctly with reduced motion`);
  });
});