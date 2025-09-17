import { test, expect } from '@playwright/test';

test.describe('Chat Integration Issues Investigation', () => {
  test('503 Error with Chat Suggestions - Network Monitoring', async ({ page }) => {
    // Enable network monitoring
    const networkRequests = [];
    const networkResponses = [];
    const consoleMessages = [];

    // Monitor all network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
    });

    // Monitor all network responses
    page.on('response', response => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: Date.now()
      });
    });

    // Monitor console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    await page.goto('/');

    // Take initial screenshot
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/initial-page.png',
      fullPage: true
    });

    // Open chat interface using the chat-icon div wrapper (more reliable)
    const chatIconDiv = page.locator('#chat-icon');
    await expect(chatIconDiv).toBeVisible();
    await chatIconDiv.click({ force: true });

    // Wait for chat container to be visible
    await page.locator('.chat-container.visible').waitFor();

    // Take screenshot of opened chat
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/chat-opened.png',
      fullPage: true
    });

    // Look for chat suggestions
    const suggestionsContainer = page.locator('.chat-suggestions');
    await expect(suggestionsContainer).toBeVisible();

    // Find all suggestion chips
    const suggestionChips = page.locator('.chat-suggestions .chip');
    const chipCount = await suggestionChips.count();
    console.log(`Found ${chipCount} suggestion chips`);

    // Specifically look for "Create a SaaS MVP" suggestion
    const saasChip = suggestionChips.filter({ hasText: 'Create a SaaS MVP' });
    await expect(saasChip).toBeVisible();

    // Take screenshot before clicking suggestion
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/before-suggestion-click.png',
      fullPage: true
    });

    // Click on "Create a SaaS MVP" suggestion and monitor network traffic
    console.log('Clicking on "Create a SaaS MVP" suggestion...');
    await saasChip.click();

    // Wait for potential network requests
    await page.waitForTimeout(5000);

    // Take screenshot after clicking suggestion
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/after-suggestion-click.png',
      fullPage: true
    });

    // Check for 503 errors in network responses
    const errorResponses = networkResponses.filter(response => response.status === 503);
    console.log('503 Error Responses:', errorResponses);

    // Check for any other error responses
    const allErrorResponses = networkResponses.filter(response => response.status >= 400);
    console.log('All Error Responses:', allErrorResponses);

    // Check console for errors
    const errorMessages = consoleMessages.filter(msg => msg.type === 'error');
    console.log('Console Errors:', errorMessages);

    // Log all network requests for analysis
    console.log('All Network Requests:', networkRequests);
    console.log('All Network Responses:', networkResponses.map(r => ({
      url: r.url,
      status: r.status,
      statusText: r.statusText
    })));

    // Verify the message was added to chat
    const userMessages = page.locator('.message.user');
    await expect(userMessages).toHaveCount(1);
    await expect(userMessages.first()).toContainText('Create a SaaS MVP');

    // Check if suggestions are hidden after clicking
    await expect(suggestionsContainer).toBeHidden();

    // Document findings
    if (errorResponses.length > 0) {
      console.error('❌ FOUND 503 ERRORS:', errorResponses);
    } else {
      console.log('✅ No 503 errors detected');
    }

    if (errorMessages.length > 0) {
      console.error('❌ CONSOLE ERRORS FOUND:', errorMessages);
    } else {
      console.log('✅ No console errors detected');
    }
  });

  test('Submit Button Tappability While Typing', async ({ page }) => {
    await page.goto('/');

    // Open chat interface
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click({ force: true });
    await page.locator('.chat-container.visible').waitFor();

    const chatInput = page.locator('.chat-input');
    const submitButton = page.locator('.chat-send');

    // Take screenshot of initial chat state
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/chat-input-initial.png',
      fullPage: true
    });

    // Test 1: Verify submit button is visible and enabled initially
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    // Get initial button properties
    const initialButtonProperties = await submitButton.evaluate(el => ({
      disabled: el.disabled,
      style: {
        pointerEvents: getComputedStyle(el).pointerEvents,
        zIndex: getComputedStyle(el).zIndex,
        position: getComputedStyle(el).position,
        display: getComputedStyle(el).display,
        visibility: getComputedStyle(el).visibility
      },
      boundingBox: el.getBoundingClientRect()
    }));
    console.log('Initial Submit Button Properties:', initialButtonProperties);

    // Test 2: Start typing in the input field
    await chatInput.focus();
    await chatInput.type('Testing submit button while typing', { delay: 100 });

    // Take screenshot while typing
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/while-typing.png',
      fullPage: true
    });

    // Test 3: Check button properties while typing
    const typingButtonProperties = await submitButton.evaluate(el => ({
      disabled: el.disabled,
      style: {
        pointerEvents: getComputedStyle(el).pointerEvents,
        zIndex: getComputedStyle(el).zIndex,
        position: getComputedStyle(el).position,
        display: getComputedStyle(el).display,
        visibility: getComputedStyle(el).visibility
      },
      boundingBox: el.getBoundingClientRect()
    }));
    console.log('Submit Button Properties While Typing:', typingButtonProperties);

    // Test 4: Attempt to click submit button while input is focused
    console.log('Attempting to click submit button while typing...');

    // Check if button is clickable using Playwright's built-in checks
    try {
      await submitButton.click({ timeout: 1000 });
      console.log('✅ Submit button was successfully clicked while typing');
    } catch (error) {
      console.error('❌ Submit button click failed while typing:', error.message);

      // Take screenshot of the failed state
      await page.screenshot({
        path: '/Users/nucky/Repos/Geusey3/test-results/submit-click-failed.png',
        fullPage: true
      });
    }

    // Test 5: Check if message was sent
    const messagesSent = await page.locator('.message.user').count();
    console.log(`Messages sent: ${messagesSent}`);

    // Test 6: Clear input and try again
    await chatInput.clear();
    await chatInput.type('Second test message');

    // Test 7: Try clicking with different methods
    const clickTests = [
      { method: 'click', description: 'Standard click' },
      { method: 'tap', description: 'Touch tap' },
      { method: 'dispatchEvent', description: 'Direct event dispatch' }
    ];

    for (const test of clickTests) {
      console.log(`Testing ${test.description}...`);

      try {
        if (test.method === 'click') {
          await submitButton.click({ force: true });
        } else if (test.method === 'tap') {
          await submitButton.tap();
        } else if (test.method === 'dispatchEvent') {
          await submitButton.evaluate(el => {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          });
        }
        console.log(`✅ ${test.description} succeeded`);
        break;
      } catch (error) {
        console.error(`❌ ${test.description} failed:`, error.message);
      }
    }

    // Test 8: Inspect CSS and z-index issues
    const cssAnalysis = await page.evaluate(() => {
      const input = document.querySelector('.chat-input');
      const button = document.querySelector('.chat-send');
      const container = document.querySelector('.chat-input-container');

      return {
        input: {
          zIndex: getComputedStyle(input).zIndex,
          position: getComputedStyle(input).position,
          pointerEvents: getComputedStyle(input).pointerEvents
        },
        button: {
          zIndex: getComputedStyle(button).zIndex,
          position: getComputedStyle(button).position,
          pointerEvents: getComputedStyle(button).pointerEvents
        },
        container: {
          zIndex: getComputedStyle(container).zIndex,
          position: getComputedStyle(container).position,
          pointerEvents: getComputedStyle(container).pointerEvents
        }
      };
    });
    console.log('CSS Analysis:', cssAnalysis);

    // Test 9: Check for overlapping elements
    const elementOverlap = await page.evaluate(() => {
      const button = document.querySelector('.chat-send');
      const buttonRect = button.getBoundingClientRect();
      const centerX = buttonRect.left + buttonRect.width / 2;
      const centerY = buttonRect.top + buttonRect.height / 2;

      const elementAtPoint = document.elementFromPoint(centerX, centerY);

      return {
        buttonRect,
        centerPoint: { x: centerX, y: centerY },
        elementAtPoint: {
          tagName: elementAtPoint?.tagName,
          className: elementAtPoint?.className,
          id: elementAtPoint?.id
        },
        isButtonAtPoint: elementAtPoint === button
      };
    });
    console.log('Element Overlap Analysis:', elementOverlap);

    // Final screenshot
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/final-state.png',
      fullPage: true
    });
  });

  test('Mobile Touch Interaction Testing', async ({ browser }) => {
    // Create mobile context with touch support
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3
    });
    const page = await context.newPage();

    await page.goto('/');

    // Open chat interface
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.tap();
    await page.locator('.chat-container.visible').waitFor();

    const chatInput = page.locator('.chat-input');
    const submitButton = page.locator('.chat-send');

    // Take mobile screenshot
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/mobile-chat.png',
      fullPage: true
    });

    // Test mobile keyboard interaction
    await chatInput.tap();
    await chatInput.type('Mobile test message');

    // Test submit button tap on mobile
    try {
      await submitButton.tap({ timeout: 2000 });
      console.log('✅ Mobile tap succeeded');
    } catch (error) {
      console.error('❌ Mobile tap failed:', error.message);
    }

    // Check virtual keyboard handling
    const viewportInfo = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      outerHeight: window.outerHeight,
      visualViewport: window.visualViewport ? {
        height: window.visualViewport.height,
        width: window.visualViewport.width,
        scale: window.visualViewport.scale
      } : null
    }));
    console.log('Mobile Viewport Info:', viewportInfo);

    await context.close();
  });

  test('Loading State and Error Handling', async ({ page }) => {
    await page.goto('/');

    // Open chat interface
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click({ force: true });
    await page.locator('.chat-container.visible').waitFor();

    const chatInput = page.locator('.chat-input');
    const submitButton = page.locator('.chat-send');

    // Test loading state behavior
    await chatInput.fill('Test loading state');

    // Monitor button state changes
    const buttonStates = [];

    // Click and immediately check button states
    const clickPromise = submitButton.click();

    // Check button state during loading
    for (let i = 0; i < 10; i++) {
      const state = await submitButton.evaluate(el => ({
        disabled: el.disabled,
        icon: el.querySelector('.chat-send-icon').style.display,
        loader: el.querySelector('.chat-send-loader').style.display
      }));
      buttonStates.push({ time: i * 100, ...state });
      await page.waitForTimeout(100);
    }

    await clickPromise;

    console.log('Button States During Loading:', buttonStates);

    // Take screenshot of loading state
    await page.screenshot({
      path: '/Users/nucky/Repos/Geusey3/test-results/loading-state.png',
      fullPage: true
    });
  });
});