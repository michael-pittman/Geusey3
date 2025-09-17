import { test, expect } from '@playwright/test';

test.describe('Font Accessibility Compliance Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('Font size meets WCAG minimum requirements (16px mobile)', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for chat elements to be available
    await page.click('img[src*="glitch.gif"]');
    await page.waitForSelector('.chat-container.visible', { timeout: 5000 });

    // Test chat input font size (critical for iOS zoom prevention)
    const chatInput = page.locator('.chat-input');
    await expect(chatInput).toBeVisible();

    const inputStyles = await chatInput.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight
      };
    });

    // Verify minimum 16px for mobile to prevent iOS zoom
    const fontSize = parseFloat(inputStyles.fontSize);
    expect(fontSize).toBeGreaterThanOrEqual(16);
    console.log(`✓ Chat input font size: ${inputStyles.fontSize} (≥16px required)`);

    // Test message font sizes
    await chatInput.fill('Test message for font accessibility');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.message.user', { timeout: 5000 });

    const userMessage = page.locator('.message.user').first();
    const messageStyles = await userMessage.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight
      };
    });

    const messageFontSize = parseFloat(messageStyles.fontSize);
    expect(messageFontSize).toBeGreaterThanOrEqual(14); // Minimum for content text
    console.log(`✓ Message font size: ${messageStyles.fontSize} (≥14px required)`);
  });

  test('Font contrast ratios meet WCAG AA standards', async ({ page }) => {
    await page.click('img[src*="glitch.gif"]');
    await page.waitForSelector('.chat-container.visible');

    // Test light mode contrast
    const lightModeContrast = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const computed = window.getComputedStyle(input);
      const textColor = computed.color;
      const bgColor = computed.backgroundColor;

      // Helper function to convert color to RGB values
      const getRGB = (colorStr) => {
        const div = document.createElement('div');
        div.style.color = colorStr;
        document.body.appendChild(div);
        const rgbColor = window.getComputedStyle(div).color;
        document.body.removeChild(div);
        const match = rgbColor.match(/\d+/g);
        return match ? match.map(Number) : [0, 0, 0];
      };

      // Calculate relative luminance
      const getLuminance = (rgb) => {
        const [r, g, b] = rgb.map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      // Calculate contrast ratio
      const getContrastRatio = (color1, color2) => {
        const lum1 = getLuminance(getRGB(color1));
        const lum2 = getLuminance(getRGB(color2));
        const lightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (lightest + 0.05) / (darkest + 0.05);
      };

      return {
        textColor,
        bgColor,
        contrast: getContrastRatio(textColor, bgColor)
      };
    });

    // WCAG AA requires 4.5:1 for normal text
    expect(lightModeContrast.contrast).toBeGreaterThanOrEqual(4.5);
    console.log(`✓ Light mode contrast ratio: ${lightModeContrast.contrast.toFixed(2)}:1 (≥4.5:1 required)`);

    // Test dark mode contrast
    await page.locator('.theme-toggle').click();
    await page.waitForTimeout(500); // Wait for theme transition

    const darkModeContrast = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const computed = window.getComputedStyle(input);
      const textColor = computed.color;
      const bgColor = computed.backgroundColor;

      const getRGB = (colorStr) => {
        const div = document.createElement('div');
        div.style.color = colorStr;
        document.body.appendChild(div);
        const rgbColor = window.getComputedStyle(div).color;
        document.body.removeChild(div);
        const match = rgbColor.match(/\d+/g);
        return match ? match.map(Number) : [0, 0, 0];
      };

      const getLuminance = (rgb) => {
        const [r, g, b] = rgb.map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const getContrastRatio = (color1, color2) => {
        const lum1 = getLuminance(getRGB(color1));
        const lum2 = getLuminance(getRGB(color2));
        const lightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (lightest + 0.05) / (darkest + 0.05);
      };

      return {
        textColor,
        bgColor,
        contrast: getContrastRatio(textColor, bgColor)
      };
    });

    expect(darkModeContrast.contrast).toBeGreaterThanOrEqual(4.5);
    console.log(`✓ Dark mode contrast ratio: ${darkModeContrast.contrast.toFixed(2)}:1 (≥4.5:1 required)`);
  });

  test('iOS Dynamic Type and font scaling support', async ({ page, browserName }) => {
    // Skip non-webkit browsers for iOS-specific tests
    if (browserName !== 'webkit') {
      test.skip();
    }

    // Simulate iOS device
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

    await page.click('img[src*="glitch.gif"]');
    await page.waitForSelector('.chat-container.visible');

    // Test font scaling with CSS zoom simulation
    const originalFontSizes = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const message = document.querySelector('.message') || document.createElement('div');
      return {
        input: window.getComputedStyle(input).fontSize,
        message: window.getComputedStyle(message).fontSize
      };
    });

    // Simulate iOS Dynamic Type increase (120% scale)
    await page.addStyleTag({
      content: `
        html { font-size: 120% !important; }
        body { font-size: 120% !important; }
      `
    });

    const scaledFontSizes = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const message = document.querySelector('.message') || document.createElement('div');
      return {
        input: window.getComputedStyle(input).fontSize,
        message: window.getComputedStyle(message).fontSize
      };
    });

    // Font sizes should scale proportionally
    const originalInputSize = parseFloat(originalFontSizes.input);
    const scaledInputSize = parseFloat(scaledFontSizes.input);
    const scalingRatio = scaledInputSize / originalInputSize;

    expect(scalingRatio).toBeGreaterThan(1.1); // Should scale by at least 10%
    console.log(`✓ Dynamic Type scaling: ${(scalingRatio * 100).toFixed(1)}% (>110% required)`);

    // Verify minimum size is maintained even with scaling
    expect(scaledInputSize).toBeGreaterThanOrEqual(16);
    console.log(`✓ Scaled input maintains minimum size: ${scaledInputSize}px (≥16px required)`);
  });

  test('Native font stack loading and consistency', async ({ page }) => {
    await page.click('img[src*="glitch.gif"]');
    await page.waitForSelector('.chat-container.visible');

    // Test font family consistency across components
    const fontFamilies = await page.evaluate(() => {
      const elements = [
        document.querySelector('.chat-input'),
        document.querySelector('.chat-header-title'),
        document.querySelector('body'),
        document.querySelector('.message') || document.createElement('div')
      ];

      return elements.map(el => ({
        selector: el.className || el.tagName,
        fontFamily: window.getComputedStyle(el).fontFamily,
        fontStack: window.getComputedStyle(el).fontFamily.split(',').map(f => f.trim())
      }));
    });

    // Verify native font stack is being used
    fontFamilies.forEach(({ selector, fontFamily, fontStack }) => {
      // Should start with -apple-system or BlinkMacSystemFont
      const hasNativeStack = fontStack.some(font =>
        font.includes('-apple-system') ||
        font.includes('BlinkMacSystemFont') ||
        font.includes('system-ui')
      );

      expect(hasNativeStack).toBeTruthy();
      console.log(`✓ ${selector} uses native font stack: ${fontFamily.split(',')[0]}`);
    });

    // Test font loading performance (no external font requests)
    const networkRequests = [];
    page.on('request', request => {
      if (request.url().includes('font') || request.url().includes('.woff') || request.url().includes('.ttf')) {
        networkRequests.push(request.url());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(networkRequests.length).toBe(0);
    console.log('✓ No external font requests detected (native stack only)');
  });

  test('Font rendering optimization across iOS browsers', async ({ page, browserName }) => {
    await page.click('img[src*="glitch.gif"]');
    await page.waitForSelector('.chat-container.visible');

    // Test font smoothing and rendering properties
    const fontRendering = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const computed = window.getComputedStyle(input);

      return {
        fontSmoothing: computed.webkitFontSmoothing || computed.fontSmooth,
        textRendering: computed.textRendering,
        fontKerning: computed.fontKerning,
        fontVariantLigatures: computed.fontVariantLigatures,
        fontFeatureSettings: computed.fontFeatureSettings
      };
    });

    // Verify iOS-specific font optimizations
    expect(fontRendering.fontSmoothing).toBe('antialiased');
    expect(fontRendering.textRendering).toBe('optimizelegibility');
    expect(fontRendering.fontKerning).toBe('auto');

    console.log('✓ Font rendering optimizations applied:');
    console.log(`  - Font smoothing: ${fontRendering.fontSmoothing}`);
    console.log(`  - Text rendering: ${fontRendering.textRendering}`);
    console.log(`  - Font kerning: ${fontRendering.fontKerning}`);
    console.log(`  - Ligatures: ${fontRendering.fontVariantLigatures}`);
  });

  test('Screen reader compatibility with font properties', async ({ page }) => {
    await page.click('img[src*="glitch.gif"]');
    await page.waitForSelector('.chat-container.visible');

    // Test ARIA integration with font rendering
    const ariaProps = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const container = document.querySelector('.chat-container');

      return {
        inputLabel: input.getAttribute('aria-label'),
        inputDescribedBy: input.getAttribute('aria-describedby'),
        containerRole: container.getAttribute('role'),
        containerAriaLabel: container.getAttribute('aria-label'),
        inputAccessibleName: input.accessibleName || 'No accessible name'
      };
    });

    // Verify accessibility properties aren't interfered by font settings
    expect(ariaProps.inputLabel).toBeTruthy();
    expect(ariaProps.containerRole).toBe('dialog');
    expect(ariaProps.containerAriaLabel).toBeTruthy();

    console.log('✓ ARIA properties preserved with font optimizations:');
    console.log(`  - Input label: ${ariaProps.inputLabel}`);
    console.log(`  - Container role: ${ariaProps.containerRole}`);

    // Test keyboard navigation isn't affected by font rendering
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.className);
    expect(focusedElement).toBeTruthy();
    console.log(`✓ Keyboard navigation functional: focused ${focusedElement}`);
  });

  test('Touch target sizes meet accessibility requirements', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('img[src*="glitch.gif"]');
    await page.waitForSelector('.chat-container.visible');

    // Test touch target sizes (WCAG AA requires 44x44px minimum)
    const touchTargets = await page.evaluate(() => {
      const targets = [
        document.querySelector('.chat-send'),
        document.querySelector('.header-dot'),
        document.querySelector('.theme-toggle'),
        ...document.querySelectorAll('.chip')
      ];

      return targets.map(target => {
        if (!target) return null;
        const rect = target.getBoundingClientRect();
        const computed = window.getComputedStyle(target);
        return {
          selector: target.className,
          width: Math.max(rect.width, parseFloat(computed.minWidth) || 0),
          height: Math.max(rect.height, parseFloat(computed.minHeight) || 0),
          fontSize: computed.fontSize
        };
      }).filter(Boolean);
    });

    touchTargets.forEach(target => {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
      console.log(`✓ ${target.selector}: ${target.width}x${target.height}px (≥44x44px required)`);
    });
  });

  test('Font accessibility in reduced motion mode', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.click('img[src*="glitch.gif"]');
    await page.waitForSelector('.chat-container.visible');

    // Verify fonts remain accessible with reduced motion
    const chatInput = page.locator('.chat-input');
    const inputStyles = await chatInput.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        transition: computed.transition,
        animation: computed.animation
      };
    });

    // Font size should be maintained
    const fontSize = parseFloat(inputStyles.fontSize);
    expect(fontSize).toBeGreaterThanOrEqual(16);

    // Animations should be disabled but fonts should work
    expect(inputStyles.transition).toContain('none');
    console.log('✓ Fonts accessible in reduced motion mode');
    console.log(`  - Font size maintained: ${inputStyles.fontSize}`);
    console.log(`  - Transitions disabled: ${inputStyles.transition.includes('none')}`);
  });

  test('High contrast mode font adaptations', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({
      colorScheme: 'dark',
      reducedMotion: 'no-preference'
    });

    // Add high contrast simulation
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          :root {
            --glass-opacity-base: 0.3;
            --glass-border-opacity: 0.6;
          }
        }
      `
    });

    await page.click('img[src*="glitch.gif"]');
    await page.waitForSelector('.chat-container.visible');

    // Test font readability in high contrast
    const contrastStyles = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const computed = window.getComputedStyle(input);
      return {
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        color: computed.color,
        textShadow: computed.textShadow
      };
    });

    const fontSize = parseFloat(contrastStyles.fontSize);
    expect(fontSize).toBeGreaterThanOrEqual(16);

    console.log('✓ High contrast mode font accessibility:');
    console.log(`  - Font size: ${contrastStyles.fontSize}`);
    console.log(`  - Font weight: ${contrastStyles.fontWeight}`);
    console.log(`  - Text shadow: ${contrastStyles.textShadow !== 'none' ? 'Applied' : 'None'}`);
  });
});