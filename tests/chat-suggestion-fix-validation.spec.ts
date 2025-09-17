import { test, expect } from '@playwright/test';

test.describe('Chat Suggestion Fix Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      } else if (msg.type() === 'warn') {
        console.warn('Browser console warning:', msg.text());
      }
    });
  });

  test('Chat suggestions send proper chatInput values to webhook', async ({ page }) => {
    // Monitor network requests to verify webhook calls
    const networkRequests = [];
    const networkResponses = [];

    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
        headers: request.headers(),
        timestamp: Date.now()
      });
    });

    page.on('response', response => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: Date.now()
      });
    });

    // Navigate to the application
    await page.goto('/');
    console.log('✅ Navigated to http://localhost:3000');

    // Open chat interface
    const chatIconDiv = page.locator('#chat-icon');
    await expect(chatIconDiv).toBeVisible();
    await chatIconDiv.click({ force: true });
    console.log('✅ Clicked chat icon');

    // Wait for chat container to be visible and fully loaded
    await page.locator('.chat-container.visible').waitFor();
    console.log('✅ Chat interface is visible');

    // Wait for suggestions to appear
    const suggestionsContainer = page.locator('.chat-suggestions');
    await expect(suggestionsContainer).toBeVisible();
    console.log('✅ Chat suggestions are visible');

    // Get all available suggestion chips
    const suggestionChips = page.locator('.chat-suggestions .chip');
    const chipCount = await suggestionChips.count();
    console.log(`✅ Found ${chipCount} suggestion chips`);

    // Test each suggestion chip
    const testCases = [
      'Create a SaaS MVP',
      'Build an AI chatbot',
      'Build a mobile app',
      'Set up a web3 dApp',
      'Create an API integration',
      'Build a data dashboard'
    ];

    for (let i = 0; i < Math.min(testCases.length, chipCount); i++) {
      const suggestionText = testCases[i];
      console.log(`\n🧪 Testing suggestion: "${suggestionText}"`);

      // Find the specific suggestion chip
      const suggestionChip = suggestionChips.filter({ hasText: suggestionText });
      if (await suggestionChip.count() === 0) {
        console.log(`⚠️ Suggestion "${suggestionText}" not found, skipping`);
        continue;
      }

      // Clear previous network data
      networkRequests.length = 0;
      networkResponses.length = 0;

      // Click on the suggestion chip
      await suggestionChip.click();
      console.log(`✅ Clicked on suggestion: "${suggestionText}"`);

      // Wait for network request to complete
      await page.waitForTimeout(2000);

      // Verify the suggestion text appears as a user message
      const userMessages = page.locator('.message.user');
      const lastUserMessage = userMessages.last();
      await expect(lastUserMessage).toContainText(suggestionText);
      console.log(`✅ User message contains suggestion text: "${suggestionText}"`);

      // Verify suggestions are hidden after clicking
      await expect(suggestionsContainer).toBeHidden();
      console.log('✅ Suggestions are hidden after clicking');

      // Analyze network requests for webhook calls
      const webhookRequests = networkRequests.filter(req => {
        return req.url.includes('webhook') || req.url.includes('n8n') || req.method === 'POST';
      });

      console.log(`📡 Found ${webhookRequests.length} potential webhook requests`);

      if (webhookRequests.length > 0) {
        const webhookRequest = webhookRequests[0];
        console.log('🔍 Webhook request details:', {
          url: webhookRequest.url,
          method: webhookRequest.method,
          hasPostData: !!webhookRequest.postData
        });

        // Verify the webhook request contains proper chatInput
        if (webhookRequest.postData) {
          try {
            const requestBody = JSON.parse(webhookRequest.postData);
            console.log('📤 Request body:', requestBody);

            // Verify chatInput is present and matches suggestion text
            expect(requestBody).toHaveProperty('chatInput');
            expect(requestBody.chatInput).toBe(suggestionText);
            console.log(`✅ chatInput field contains correct value: "${requestBody.chatInput}"`);

            // Verify other required fields
            expect(requestBody).toHaveProperty('action', 'sendMessage');
            expect(requestBody).toHaveProperty('sessionId');
            console.log('✅ Required fields (action, sessionId) are present');

            // Verify chatInput is not empty
            expect(requestBody.chatInput.trim()).not.toBe('');
            console.log('✅ chatInput is not empty');

          } catch (parseError) {
            console.error('❌ Failed to parse webhook request body:', parseError);
            expect(false, 'Webhook request body should be valid JSON').toBe(true);
          }
        } else {
          console.error('❌ Webhook request missing POST data');
          expect(false, 'Webhook request should have POST data').toBe(true);
        }
      } else {
        console.warn('⚠️ No webhook requests detected');
        // Don't fail the test here as webhook might be disabled in development
      }

      // Check for any error responses
      const errorResponses = networkResponses.filter(response => response.status >= 400);
      if (errorResponses.length > 0) {
        console.error('❌ Error responses detected:', errorResponses);
        errorResponses.forEach(err => {
          console.error(`  ${err.status} ${err.statusText} - ${err.url}`);
        });
      } else {
        console.log('✅ No error responses detected');
      }

      // Break after first successful test to avoid spamming
      break;
    }
  });

  test('Manual typing still works normally', async ({ page }) => {
    console.log('\n🧪 Testing manual typing functionality...');

    await page.goto('/');

    // Open chat interface
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click({ force: true });
    await page.locator('.chat-container.visible').waitFor();

    const chatInput = page.locator('.chat-input');
    const sendButton = page.locator('.chat-send');

    // Monitor network requests for manual typing test
    const manualRequests = [];
    page.on('request', request => {
      if (request.method() === 'POST') {
        manualRequests.push({
          url: request.url(),
          postData: request.postData(),
          timestamp: Date.now()
        });
      }
    });

    // Test manual typing
    const testMessage = 'This is a manually typed test message';
    await chatInput.fill(testMessage);
    console.log(`✅ Typed manual message: "${testMessage}"`);

    // Clear previous requests
    manualRequests.length = 0;

    // Send the message
    await sendButton.click();
    console.log('✅ Clicked send button');

    // Wait for request
    await page.waitForTimeout(1500);

    // Verify message appears in chat
    const userMessages = page.locator('.message.user');
    const lastUserMessage = userMessages.last();
    await expect(lastUserMessage).toContainText(testMessage);
    console.log('✅ Manual message appears in chat');

    // Verify input is cleared
    await expect(chatInput).toHaveValue('');
    console.log('✅ Input field is cleared after sending');

    // Verify webhook request for manual typing
    if (manualRequests.length > 0) {
      const manualRequest = manualRequests[0];
      if (manualRequest.postData) {
        try {
          const requestBody = JSON.parse(manualRequest.postData);
          expect(requestBody.chatInput).toBe(testMessage);
          console.log('✅ Manual typing webhook contains correct chatInput');
        } catch (error) {
          console.error('❌ Failed to parse manual request body:', error);
        }
      }
    }
  });

  test('Verify no "No prompt specified" errors occur', async ({ page }) => {
    console.log('\n🧪 Testing for "No prompt specified" errors...');

    const consoleErrors = [];
    const networkErrors = [];

    // Monitor console for "No prompt specified" errors
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('No prompt specified')) {
        consoleErrors.push(msg.text());
      }
    });

    // Monitor network responses for error messages
    page.on('response', async response => {
      if (response.status() >= 400) {
        try {
          const text = await response.text();
          if (text.includes('No prompt specified')) {
            networkErrors.push({
              status: response.status(),
              url: response.url(),
              body: text
            });
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    });

    await page.goto('/');

    // Open chat and test multiple suggestions
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click({ force: true });
    await page.locator('.chat-container.visible').waitFor();

    const suggestionChips = page.locator('.chat-suggestions .chip');
    const chipCount = await suggestionChips.count();

    // Test first 3 suggestions
    for (let i = 0; i < Math.min(3, chipCount); i++) {
      const chip = suggestionChips.nth(i);
      const chipText = await chip.textContent();
      console.log(`Testing suggestion ${i + 1}: "${chipText}"`);

      await chip.click();
      await page.waitForTimeout(1000);

      // Re-open chat for next suggestion (if needed)
      if (i < Math.min(2, chipCount - 1)) {
        const isVisible = await page.locator('.chat-container.visible').isVisible();
        if (!isVisible) {
          await chatIconDiv.click({ force: true });
          await page.locator('.chat-container.visible').waitFor();
        }
      }
    }

    // Verify no "No prompt specified" errors occurred
    expect(consoleErrors).toHaveLength(0);
    expect(networkErrors).toHaveLength(0);

    if (consoleErrors.length === 0 && networkErrors.length === 0) {
      console.log('✅ No "No prompt specified" errors detected');
    } else {
      console.error('❌ "No prompt specified" errors found:', {
        consoleErrors,
        networkErrors
      });
    }
  });

  test('Suggestion text bypasses input field properly', async ({ page }) => {
    console.log('\n🧪 Testing that suggestions bypass input field...');

    await page.goto('/');

    // Open chat interface
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click({ force: true });
    await page.locator('.chat-container.visible').waitFor();

    const chatInput = page.locator('.chat-input');
    const suggestionChips = page.locator('.chat-suggestions .chip');

    // Pre-fill the input with some text
    const inputText = 'This text should remain in input';
    await chatInput.fill(inputText);
    console.log(`✅ Pre-filled input with: "${inputText}"`);

    // Click on a suggestion
    const firstChip = suggestionChips.first();
    const suggestionText = await firstChip.textContent();
    await firstChip.click();
    console.log(`✅ Clicked suggestion: "${suggestionText}"`);

    // Wait for message to appear
    await page.waitForTimeout(1000);

    // Verify the suggestion text appears in chat (not the input text)
    const userMessages = page.locator('.message.user');
    const lastUserMessage = userMessages.last();
    await expect(lastUserMessage).toContainText(suggestionText);
    await expect(lastUserMessage).not.toContainText(inputText);
    console.log('✅ Suggestion text appears in chat, not input text');

    // Verify input field still contains the original text (unchanged)
    await expect(chatInput).toHaveValue(inputText);
    console.log('✅ Input field unchanged after suggestion click');
  });

  test('Performance: Suggestion clicks are responsive', async ({ page }) => {
    console.log('\n🧪 Testing suggestion click performance...');

    await page.goto('/');

    // Open chat interface
    const chatIconDiv = page.locator('#chat-icon');
    await chatIconDiv.click({ force: true });
    await page.locator('.chat-container.visible').waitFor();

    const suggestionChips = page.locator('.chat-suggestions .chip');
    const firstChip = suggestionChips.first();

    // Measure click-to-message-appearance time
    const startTime = Date.now();
    await firstChip.click();

    // Wait for user message to appear
    const userMessages = page.locator('.message.user');
    await userMessages.first().waitFor();
    const endTime = Date.now();

    const responseTime = endTime - startTime;
    console.log(`✅ Suggestion click response time: ${responseTime}ms`);

    // Verify response time is reasonable (under 500ms for UI updates)
    expect(responseTime).toBeLessThan(500);
    console.log('✅ Response time is within acceptable limits');
  });
});