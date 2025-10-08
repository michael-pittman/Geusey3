import { test, expect } from '@playwright/test';

test.describe('Theme toggle and persistence', () => {
  test('toggles dark mode and persists across reloads', async ({ page }) => {
    await page.goto('/');

    // Open chat to reveal header toggle
    await page.locator('#chat-icon').click();
    await page.locator('.chat-container.visible').waitFor();

    // Locate the toggle button via aria-label inside chat header
    const toggle = page.getByRole('button', { name: /toggle dark mode/i });
    await expect(toggle).toBeVisible();

    // Confirm initial theme attribute exists
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(initialTheme === 'light' || initialTheme === 'dark').toBeTruthy();

    // Click to toggle
    await toggle.click();

    // Verify theme attribute flips
    const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(newTheme).not.toBe(initialTheme);

    // Check computed body background
    const bodyExpectation = newTheme === 'dark'
      ? /rgba?\(\s*20,\s*20,\s*22(,\s*([01]|0?\.\d+))?\s*\)/
      : /rgba?\(\s*237,\s*207,\s*207(,\s*([01]|0?\.\d+))?\s*\)/;
    await expect.poll(async () => {
      return await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    }, { timeout: 3000 }).toMatch(bodyExpectation);

    // Verify chat text contrast token applied on a message bubble
    // Inject a message for style check
    await page.evaluate(() => {
      const container = document.querySelector('.chat-messages');
      if (container) {
        const div = document.createElement('div');
        div.className = 'message bot';
        div.textContent = 'contrast-check';
        container.appendChild(div);
      }
    });

    const bubbleExpectation = newTheme === 'dark'
      ? /rgba?\(\s*3[01],\s*2[01],\s*2[01](,\s*([01]|0?\.\d+))?\s*\)/
      : /rgba?\(\s*48,\s*36,\s*36(,\s*([01]|0?\.\d+))?\s*\)/;
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const el = document.querySelector('.message');
        return el ? getComputedStyle(el).color : '';
      });
    }, { timeout: 3000 }).toMatch(bubbleExpectation);

    // Reload and verify persistence
    await page.reload();
    const persistedTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(persistedTheme).toBe(newTheme);
  });
});

test.describe('UX enhancements', () => {
  test('shows one-time hint pill near chat icon', async ({ page }) => {
    await page.goto('/');
    const pill = page.locator('.chat-hint-pill');
    await expect(pill).toBeVisible();
    // After a few seconds it fades/removes
    await page.waitForTimeout(4200);
    await expect(pill).toHaveCount(0);
    // Reload and ensure it does not show again
    await page.reload();
    await expect(page.locator('.chat-hint-pill')).toHaveCount(0);
  });

  test('first-open greeting and suggestions, and focus trap works', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chat-icon').click();
    await page.locator('.chat-container.visible').waitFor();
    // Greeting bubble appears
    await expect(page.locator('.message.bot', { hasText: 'Hi! Tell me what' })).toBeVisible();
    // Suggestions visible
    const chips = page.locator('.chat-suggestions .chip');
    await expect(chips).toHaveCount(6);
    // Click a chip triggers send and hides bar
    await chips.nth(0).click();
    await expect(page.locator('.chat-suggestions')).toBeHidden();
    // Re-open chat should not show suggestions again because user has messages
    await page.getByRole('button', { name: /close chat/i }).click();
    await page.locator('.chat-container').waitFor({ state: 'hidden' });
    await page.locator('#chat-icon').click();
    await page.locator('.chat-container.visible').waitFor();
    await expect(page.locator('.chat-suggestions')).toBeHidden();
    // Focus trap: Tab from theme toggle cycles within dialog
    const toggle = page.getByRole('button', { name: /toggle dark mode/i });
    await toggle.focus();
    await page.keyboard.press('Shift+Tab');
    const activeRole = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
    expect(activeRole).not.toBe('');
  });
});
