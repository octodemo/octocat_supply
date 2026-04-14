Feature: Shopping Cart Management
  As a user
  I want to add products to a shopping cart and manage the cart contents
  So that I can prepare orders for cat supplies

  Scenario: Add a product to the cart
    Given I am viewing the product catalog
    When I click "Add to Cart" on "SmartFeeder One"
    Then the cart icon shows "1" item
    And "SmartFeeder One" is in my cart

  Scenario: View the shopping cart
    Given I have "SmartFeeder One" in my cart
    When I click the cart icon
    Then I see the cart page
    And the cart contains "SmartFeeder One"

  Scenario: Remove item from cart
    Given I have "SmartFeeder One" in my cart
    And I am viewing the cart
    When I click "Remove" on "SmartFeeder One"
    Then the cart is empty
    And the cart icon shows "0" items

  Scenario: Update item quantity in cart
    Given I have "SmartFeeder One" in my cart
    And I am viewing the cart
    When I change the quantity to "2"
    Then the cart shows quantity "2" for "SmartFeeder One"