import { test, expect, Page } from '@playwright/test';

/**
 * Wishlist E2E tests
 * Implements: frontend/tests/features/wishlist.feature
 *
 * Covers:
 * - Adding a product to a new wishlist via heart icon
 * - "My Wishlist" navigation link appears after first add
 * - Wishlist page shows added products
 * - Share link button copies URL to clipboard
 * - Read-only view for recipients (no remove buttons)
 * - Removing a product from the wishlist
 * - Empty state on a wishlist with no items
 */

const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';

/**
 * Helper: clear wishlist localStorage keys so each test starts fresh
 */
async function clearWishlistStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('wishlist_token');
    localStorage.removeItem('wishlist_items');
  });
}

/**
 * Helper: wait for the product grid to be fully loaded
 */
async function waitForProducts(page: Page) {
  await page.goto('/products');
  await expect(page.locator('h1:has-text("Products")')).toBeVisible();
  // Wait for at least one product card to appear
  await expect(page.locator('[aria-label^="Add"][aria-label$="to wishlist"]').first()).toBeVisible();
}

test.describe('Wishlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearWishlistStorage(page);
  });

  test('Add a product to a new wishlist – heart becomes filled and nav link appears', async ({
    page,
  }) => {
    // Given I am viewing the product catalog
    await waitForProducts(page);

    // The "My Wishlist" nav link must NOT be visible yet
    await expect(page.locator('nav a:has-text("My Wishlist")')).not.toBeVisible();

    // When I click the heart icon of the first product
    const heartBtn = page.locator('[aria-label^="Add"][aria-label$="to wishlist"]').first();
    await heartBtn.click();

    // Then the heart icon becomes filled (aria-pressed = true)
    await expect(
      page.locator('[aria-pressed="true"][aria-label^="Remove"]'),
    ).toBeVisible({ timeout: 10_000 });

    // And "My Wishlist" link appears in the navigation
    await expect(page.locator('nav a:has-text("My Wishlist")')).toBeVisible({ timeout: 10_000 });
  });

  test('Navigate to the wishlist page and see the added product', async ({ page }) => {
    // Given I have added a product to my wishlist
    await waitForProducts(page);
    const heartBtn = page.locator('[aria-label^="Add"][aria-label$="to wishlist"]').first();
    // Capture the product name from the card before clicking
    const card = heartBtn.locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    const productName = await card.locator('h3').textContent();
    await heartBtn.click();
    await expect(page.locator('nav a:has-text("My Wishlist")')).toBeVisible({ timeout: 10_000 });

    // When I click "My Wishlist" in the navigation
    await page.click('nav a:has-text("My Wishlist")');

    // Then I land on the wishlist page
    await expect(page).toHaveURL(/\/wishlist\//);
    await expect(page.locator('h1:has-text("Wishlist")')).toBeVisible();

    // And I see the product I added
    if (productName) {
      await expect(page.locator(`text=${productName.trim()}`).first()).toBeVisible();
    }
  });

  test('Share link button shows "Copied!" feedback', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Given I have a wishlist with a product
    await waitForProducts(page);
    await page.locator('[aria-label^="Add"][aria-label$="to wishlist"]').first().click();
    await expect(page.locator('nav a:has-text("My Wishlist")')).toBeVisible({ timeout: 10_000 });
    await page.click('nav a:has-text("My Wishlist")');
    await expect(page.locator('h1:has-text("Wishlist")')).toBeVisible();

    // When I click the "Share link" button
    const shareBtn = page.locator('button:has-text("Share link")');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Then the button label changes to "Copied!"
    await expect(page.locator('button:has-text("Copied!")')).toBeVisible({ timeout: 5_000 });
  });

  test('Recipient sees wishlist read-only – no remove buttons', async ({ page }) => {
    // Given: create a wishlist via the API directly, then visit the URL as a stranger
    // (no token in localStorage => read-only view)
    const response = await page.request.post(`${API_BASE}/api/wishlists`);
    expect(response.ok()).toBeTruthy();
    const { shareToken } = (await response.json()) as { shareToken: string };

    // Add a product via API so the list is non-empty
    await page.request.post(`${API_BASE}/api/wishlists/${shareToken}/items`, {
      data: { productId: 1 },
    });

    // Open the share URL without owning the token (localStorage was cleared in beforeEach)
    await page.goto(`/wishlist/${shareToken}`);
    await expect(page.locator('h1:has-text("Wishlist")')).toBeVisible();

    // I see at least one product item
    const items = page.locator('ul[aria-label="Wishlist items"] li');
    await expect(items.first()).toBeVisible({ timeout: 10_000 });

    // No remove (trash) button visible
    await expect(page.locator('button[aria-label^="Remove"]')).not.toBeVisible();

    // Share link button is still visible
    await expect(page.locator('button:has-text("Share link")')).toBeVisible();
  });

  test('Remove a product from my own wishlist', async ({ page }) => {
    // Given I have a wishlist with a product
    await waitForProducts(page);
    const heartBtn = page.locator('[aria-label^="Add"][aria-label$="to wishlist"]').first();
    const card = heartBtn.locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    const productName = await card.locator('h3').textContent();
    await heartBtn.click();
    await expect(page.locator('nav a:has-text("My Wishlist")')).toBeVisible({ timeout: 10_000 });
    await page.click('nav a:has-text("My Wishlist")');
    await expect(page.locator('h1:has-text("Wishlist")')).toBeVisible();

    // When I click the remove button for that product
    const removeBtn = page.locator('button[aria-label^="Remove"]').first();
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    // Then the product is no longer visible
    if (productName) {
      await expect(page.locator(`text=${productName.trim()}`).first()).not.toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('Empty state shown on a wishlist with no products', async ({ page }) => {
    // Given: create an empty wishlist via the API
    const response = await page.request.post(`${API_BASE}/api/wishlists`);
    expect(response.ok()).toBeTruthy();
    const { shareToken } = (await response.json()) as { shareToken: string };

    // Set the token in localStorage so the page is shown in owner mode
    await page.evaluate((token: string) => {
      localStorage.setItem('wishlist_token', token);
      localStorage.setItem('wishlist_items', '[]');
    }, shareToken);

    // When I navigate to the wishlist page
    await page.goto(`/wishlist/${shareToken}`);
    await expect(page.locator('h1:has-text("Wishlist")')).toBeVisible();

    // Then I see the empty state message
    await expect(page.locator('[role="status"]')).toBeVisible();
    await expect(page.locator('text=This wishlist is empty')).toBeVisible();

    // And I see the link to browse products
    await expect(page.locator('a:has-text("Browse products to add some")')).toBeVisible();
  });
});
