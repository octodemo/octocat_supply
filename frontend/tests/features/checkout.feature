Feature: Checkout Process
  As a user
  I want to complete my order through a checkout process
  So that I can place orders for cat supplies

  Scenario: Proceed to checkout from cart
    Given I have items in my cart
    When I click "Proceed to Checkout"
    Then I see the checkout page
    And the order summary shows my cart items

  Scenario: Complete checkout with dummy payment
    Given I am on the checkout page with items
    When I fill in shipping information
    And I enter dummy payment details
    And I click "Place Order"
    Then I see an order confirmation
    And my cart is empty