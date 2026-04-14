import { test, expect } from '@playwright/test';

/**
 * Shopping Cart Management E2E tests
 * Implements: frontend/tests/features/shopping-cart.feature
 *
 * Covers:
 * - Adding products to cart
 * - Viewing cart contents
 * - Removing items from cart
 * - Updating item quantities
 */

test.describe('Shopping Cart Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home and ensure clean state
    await page.goto('/');
    // Clear localStorage if needed for cart
    await page.evaluate(() => localStorage.clear());
  });

  test('Add a product to the cart', async ({ page }) => {
    // Given I am viewing the product catalog
    await page.goto('/products');
    await expect(page.locator('h1:has-text("Products")')).toBeVisible();

    // Wait for products to load
    await expect(page.locator('h3:has-text("SmartFeeder One")')).toBeVisible();

    // When I click "Add to Cart" on "SmartFeeder One"
    const addButton = page.locator('button:has-text("Add to Cart")').first(); // Assuming first product is SmartFeeder One
    await addButton.click();

    // Then the cart icon shows "1" item
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    await expect(cartIcon).toContainText('1');

    // And "SmartFeeder One" is in my cart
    // Check localStorage or context, but for e2e, perhaps check by viewing cart
    await cartIcon.click();
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.locator('text=SmartFeeder One')).toBeVisible();
  });

  test('View the shopping cart', async ({ page }) => {
    // Given I have "SmartFeeder One" in my cart
    await page.goto('/products');
    await expect(page.locator('h3:has-text("SmartFeeder One")')).toBeVisible();
    const addButton = page.locator('button:has-text("Add to Cart")').first();
    await addButton.click();

    // When I click the cart icon
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    await cartIcon.click();

    // Then I see the cart page
    await expect(page).toHaveURL(/\/cart/);

    // And the cart contains "SmartFeeder One"
    await expect(page.locator('text=SmartFeeder One')).toBeVisible();
  });

  test('Remove item from cart', async ({ page }) => {
    // Given I have "SmartFeeder One" in my cart
    await page.goto('/products');
    const addButton = page.locator('button:has-text("Add to Cart")').first();
    await addButton.click();

    // And I am viewing the cart
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    await cartIcon.click();
    await expect(page.locator('text=SmartFeeder One')).toBeVisible();

    // When I click "Remove" on "SmartFeeder One"
    const removeButton = page.locator('button:has-text("Remove")').first();
    await removeButton.click();

    // Then the cart is empty
    await expect(page.locator('text=Your cart is empty')).toBeVisible();

    // And the cart icon shows "0" items
    await page.goto('/'); // Go back to see nav
    const cartIconAgain = page.locator('[data-testid="cart-icon"]');
    await expect(cartIconAgain).toContainText('0');
  });

  test('Update item quantity in cart', async ({ page }) => {
    // Given I have "SmartFeeder One" in my cart
    await page.goto('/products');
    const addButton = page.locator('button:has-text("Add to Cart")').first();
    await addButton.click();

    // And I am viewing the cart
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    await cartIcon.click();
    await expect(page.locator('text=SmartFeeder One')).toBeVisible();

    // When I change the quantity to "2"
    const quantityInput = page.locator('input[type="number"]').first();
    await quantityInput.fill('2');

    // Then the cart shows quantity "2" for "SmartFeeder One"
    await expect(quantityInput).toHaveValue('2');
  });
});