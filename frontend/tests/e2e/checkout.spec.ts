import { test, expect } from '@playwright/test';

/**
 * Checkout Process E2E tests
 * Implements: frontend/tests/features/checkout.feature
 *
 * Covers:
 * - Proceeding to checkout from cart
 * - Completing checkout with dummy payment
 */

test.describe('Checkout Process', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home and ensure clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('Proceed to checkout from cart', async ({ page }) => {
    // Given I have items in my cart
    await page.goto('/products');
    const addButton = page.locator('button:has-text("Add to Cart")').first();
    await addButton.click();

    // When I click "Proceed to Checkout"
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    await cartIcon.click();
    const checkoutLink = page.locator('a:has-text("Proceed to Checkout")');
    await checkoutLink.click();

    // Then I see the checkout page
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();

    // And the order summary shows my cart items
    await expect(page.locator('text=SmartFeeder One')).toBeVisible();
  });

  test('Complete checkout with dummy payment', async ({ page }) => {
    // Given I am on the checkout page with items
    await page.goto('/products');
    const addButton = page.locator('button:has-text("Add to Cart")').first();
    await addButton.click();
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    await cartIcon.click();
    const checkoutLink = page.locator('a:has-text("Proceed to Checkout")');
    await checkoutLink.click();

    // When I fill in shipping information
    await page.fill('input[placeholder="Full Name"]', 'John Doe');
    await page.fill('input[placeholder="Email"]', 'john@example.com');
    await page.fill('input[placeholder="Address"]', '123 Main St');
    await page.fill('input[placeholder="City"]', 'Anytown');
    await page.fill('input[placeholder="ZIP Code"]', '12345');

    // And I enter dummy payment details
    await page.fill('input[placeholder*="Card Number"]', '1234 5678 9012 3456');
    await page.fill('input[placeholder="MM/YY"]', '12/25');
    await page.fill('input[placeholder="CVV"]', '123');

    // And I click "Place Order"
    await page.click('button:has-text("Place Order")');

    // Then I see an order confirmation
    await expect(page.locator('h1:has-text("Order Confirmed!")')).toBeVisible();
    await expect(page.locator('text=Thank you for your order')).toBeVisible();

    // And my cart is empty
    await page.goto('/cart');
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
  });
});