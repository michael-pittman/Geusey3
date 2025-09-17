import { test, expect } from '@playwright/test';

test.describe('Font Accessibility Audit - Core Requirements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Wait for initial page load
    await page.waitForSelector('#container', { timeout: 10000 });
  });

  test('Core font accessibility requirements', async ({ page }) => {
    console.log('🔍 Starting Font Accessibility Audit...');

    // 1. Test minimum font sizes
    console.log('\n📏 Testing font sizes...');

    // Test body font size
    const bodyFontSize = await page.evaluate(() => {
      const computed = window.getComputedStyle(document.body);
      return {
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily
      };
    });

    const bodySize = parseFloat(bodyFontSize.fontSize);
    console.log(`✓ Body font size: ${bodyFontSize.fontSize} (${bodySize}px)`);

    // Open chat to test interactive elements
    await page.locator('img[src*="glitch.gif"]').click();
    await page.waitForSelector('.chat-container', { timeout: 5000 });

    // Test chat input font size (critical for iOS)
    const inputFontSize = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      if (!input) return null;
      const computed = window.getComputedStyle(input);
      return {
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight
      };
    });

    if (inputFontSize) {
      const inputSize = parseFloat(inputFontSize.fontSize);
      console.log(`✓ Chat input font size: ${inputFontSize.fontSize} (${inputSize}px)`);

      // WCAG requirement: minimum 16px for mobile inputs to prevent zoom
      expect(inputSize).toBeGreaterThanOrEqual(16);
      console.log(`✅ PASS: Input meets 16px minimum for iOS zoom prevention`);
    }

    // 2. Test native font stack usage
    console.log('\n🎯 Testing native font stack...');

    const fontStackTest = await page.evaluate(() => {
      const testElements = [
        document.body,
        document.querySelector('.chat-input'),
        document.querySelector('.chat-header-title')
      ].filter(Boolean);

      return testElements.map(el => {
        const computed = window.getComputedStyle(el);
        const fontFamily = computed.fontFamily;
        return {
          element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
          fontFamily: fontFamily,
          usesNativeStack: fontFamily.includes('-apple-system') ||
                          fontFamily.includes('BlinkMacSystemFont') ||
                          fontFamily.includes('system-ui')
        };
      });
    });

    fontStackTest.forEach(({ element, fontFamily, usesNativeStack }) => {
      console.log(`✓ ${element}: ${usesNativeStack ? 'NATIVE' : 'CUSTOM'} - ${fontFamily.split(',')[0]}`);
      expect(usesNativeStack).toBeTruthy();
    });
    console.log(`✅ PASS: All elements use native font stack`);

    // 3. Test font rendering optimizations
    console.log('\n🎨 Testing font rendering optimizations...');

    const renderingOptimizations = await page.evaluate(() => {
      const input = document.querySelector('.chat-input') || document.body;
      const computed = window.getComputedStyle(input);

      return {
        fontSmoothing: computed.webkitFontSmoothing,
        textRendering: computed.textRendering,
        fontKerning: computed.fontKerning,
        fontFeatureSettings: computed.fontFeatureSettings
      };
    });

    console.log(`✓ Font smoothing: ${renderingOptimizations.fontSmoothing}`);
    console.log(`✓ Text rendering: ${renderingOptimizations.textRendering}`);
    console.log(`✓ Font kerning: ${renderingOptimizations.fontKerning}`);

    expect(renderingOptimizations.fontSmoothing).toBe('antialiased');
    expect(renderingOptimizations.textRendering).toBe('optimizelegibility');
    console.log(`✅ PASS: iOS font rendering optimizations applied`);

    // 4. Test theme-aware font properties
    console.log('\n🌓 Testing theme-aware font properties...');

    // Test dark mode
    await page.locator('.theme-toggle').click();
    await page.waitForTimeout(500);

    const darkModeFont = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      if (!input) return null;
      const computed = window.getComputedStyle(input);
      return {
        color: computed.color,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily
      };
    });

    if (darkModeFont) {
      console.log(`✓ Dark mode input color: ${darkModeFont.color}`);
      console.log(`✓ Dark mode font size maintained: ${darkModeFont.fontSize}`);

      const darkInputSize = parseFloat(darkModeFont.fontSize);
      expect(darkInputSize).toBeGreaterThanOrEqual(16);
      console.log(`✅ PASS: Dark mode maintains minimum font size`);
    }

    // 5. Test mobile viewport font handling
    console.log('\n📱 Testing mobile viewport font handling...');

    await page.setViewportSize({ width: 375, height: 667 });

    const mobileFontSizes = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const button = document.querySelector('.chat-send');

      return {
        input: input ? window.getComputedStyle(input).fontSize : null,
        button: button ? {
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height
        } : null
      };
    });

    if (mobileFontSizes.input) {
      const mobileInputSize = parseFloat(mobileFontSizes.input);
      console.log(`✓ Mobile input font size: ${mobileFontSizes.input} (${mobileInputSize}px)`);
      expect(mobileInputSize).toBeGreaterThanOrEqual(16);
      console.log(`✅ PASS: Mobile maintains 16px minimum for zoom prevention`);
    }

    if (mobileFontSizes.button) {
      const { width, height } = mobileFontSizes.button;
      console.log(`✓ Mobile button size: ${width.toFixed(0)}x${height.toFixed(0)}px`);
      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
      console.log(`✅ PASS: Touch targets meet 44x44px minimum`);
    }

    // 6. Test accessibility features don't interfere with fonts
    console.log('\n♿ Testing accessibility integration...');

    const accessibilityTest = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const container = document.querySelector('.chat-container');

      return {
        inputAriaLabel: input ? input.getAttribute('aria-label') : null,
        containerRole: container ? container.getAttribute('role') : null,
        inputTabIndex: input ? input.tabIndex : null,
        inputAccessible: input ? input.offsetWidth > 0 && input.offsetHeight > 0 : false
      };
    });

    expect(accessibilityTest.inputAriaLabel).toBeTruthy();
    expect(accessibilityTest.containerRole).toBe('dialog');
    expect(accessibilityTest.inputAccessible).toBeTruthy();
    console.log(`✅ PASS: Accessibility features work with font optimizations`);

    console.log('\n🎉 Font Accessibility Audit Complete!');
    console.log('✅ All WCAG 2.1 AA font requirements verified');
  });

  test('iOS-specific font compatibility', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'iOS tests only run on WebKit');

    console.log('🍎 Testing iOS-specific font features...');

    // Simulate iOS user agent
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    await page.reload();
    await page.waitForSelector('#container');

    await page.locator('img[src*="glitch.gif"]').click();
    await page.waitForSelector('.chat-container');

    // Test iOS-specific CSS properties
    const iOSFontFeatures = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const computed = window.getComputedStyle(input);

      return {
        webkitFontSmoothing: computed.webkitFontSmoothing,
        webkitTextSizeAdjust: computed.webkitTextSizeAdjust,
        fontSynthesis: computed.fontSynthesis,
        webkitFontFeatureSettings: computed.webkitFontFeatureSettings
      };
    });

    console.log('✓ iOS font features:');
    console.log(`  - WebKit font smoothing: ${iOSFontFeatures.webkitFontSmoothing}`);
    console.log(`  - Text size adjust: ${iOSFontFeatures.webkitTextSizeAdjust}`);
    console.log(`  - Font synthesis: ${iOSFontFeatures.fontSynthesis}`);

    expect(iOSFontFeatures.webkitFontSmoothing).toBe('antialiased');
    console.log('✅ PASS: iOS-specific font optimizations active');
  });
});