import { test, expect } from '@playwright/test';

test('Debug Page Structure', async ({ page }) => {
  await page.goto('/');

  // Take initial screenshot
  await page.screenshot({
    path: '/Users/nucky/Repos/Geusey3/test-results/page-structure.png',
    fullPage: true
  });

  // Log all elements on the page
  const pageStructure = await page.evaluate(() => {
    const getAllElements = (element, depth = 0) => {
      const result = [];
      const indent = '  '.repeat(depth);

      if (element.nodeType === Node.ELEMENT_NODE) {
        const info = {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: element.className,
          attributes: {},
          text: element.textContent?.slice(0, 50)
        };

        // Get key attributes
        ['src', 'alt', 'aria-label', 'data-testid', 'role'].forEach(attr => {
          if (element.hasAttribute(attr)) {
            info.attributes[attr] = element.getAttribute(attr);
          }
        });

        result.push({ depth, ...info });

        // Recursively get children (limit depth to avoid too much output)
        if (depth < 4) {
          Array.from(element.children).forEach(child => {
            result.push(...getAllElements(child, depth + 1));
          });
        }
      }

      return result;
    };

    return getAllElements(document.body);
  });

  console.log('Page Structure:');
  pageStructure.forEach(elem => {
    const indent = '  '.repeat(elem.depth);
    console.log(`${indent}${elem.tag}${elem.id ? `#${elem.id}` : ''}${elem.className ? `.${elem.className.split(' ').join('.')}` : ''}`);
    if (Object.keys(elem.attributes).length > 0) {
      console.log(`${indent}  attrs: ${JSON.stringify(elem.attributes)}`);
    }
  });

  // Find all images
  const images = await page.locator('img').all();
  console.log(`\nFound ${images.length} images:`);

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = await img.getAttribute('src');
    const alt = await img.getAttribute('alt');
    const visible = await img.isVisible();
    const boundingBox = await img.boundingBox();

    console.log(`Image ${i}: src="${src}", alt="${alt}", visible=${visible}`);
    if (boundingBox) {
      console.log(`  Position: ${boundingBox.x}, ${boundingBox.y}, ${boundingBox.width}x${boundingBox.height}`);
    }
  }

  // Find chat-icon div
  const chatIconDiv = page.locator('#chat-icon');
  const chatIconExists = await chatIconDiv.count();
  console.log(`\nChat icon div exists: ${chatIconExists > 0}`);

  if (chatIconExists > 0) {
    const chatIconInfo = await chatIconDiv.evaluate(el => ({
      visible: !el.hidden && getComputedStyle(el).display !== 'none',
      boundingBox: el.getBoundingClientRect(),
      styles: {
        position: getComputedStyle(el).position,
        zIndex: getComputedStyle(el).zIndex,
        pointerEvents: getComputedStyle(el).pointerEvents
      }
    }));
    console.log('Chat icon div info:', chatIconInfo);
  }

  // Find elements that might be blocking the chat icon
  const potentialBlockers = await page.evaluate(() => {
    const chatIcon = document.querySelector('#chat-icon');
    if (!chatIcon) return [];

    const rect = chatIcon.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const elementsAtPoint = [];
    let element = document.elementFromPoint(centerX, centerY);

    while (element && element !== document.body) {
      elementsAtPoint.push({
        tag: element.tagName.toLowerCase(),
        id: element.id,
        className: element.className,
        zIndex: getComputedStyle(element).zIndex,
        pointerEvents: getComputedStyle(element).pointerEvents
      });
      element = element.parentElement;
    }

    return elementsAtPoint;
  });

  console.log('\nElements at chat icon center point:');
  potentialBlockers.forEach((elem, i) => {
    console.log(`  ${i}: ${elem.tag}${elem.id ? `#${elem.id}` : ''}${elem.className ? `.${elem.className.split(' ').join('.')}` : ''} (z:${elem.zIndex}, pointer:${elem.pointerEvents})`);
  });
});