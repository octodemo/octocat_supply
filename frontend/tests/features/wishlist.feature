Feature: Shareable product wishlist
  As a supply chain planner
  I want to save products to a wishlist and share it via a link
  So that I can collaborate with colleagues on product selection

  Scenario: Add a product to a new wishlist
    Given I am viewing the product catalog
    When I click the wishlist heart icon on a product card
    Then the heart icon becomes filled (red)
    And a "My Wishlist" link appears in the navigation

  Scenario: Navigate to the wishlist page
    Given I have added a product to my wishlist
    When I click "My Wishlist" in the navigation
    Then I land on the wishlist page
    And I see the product I added

  Scenario: Copy the share link from the wishlist page
    Given I am on my wishlist page
    When I click the "Share link" button
    Then the button label changes to "Copied!" briefly

  Scenario: View wishlist as a read-only recipient
    Given I open the wishlist URL without owning the wishlist token
    Then I see the wishlist items
    And I do not see any remove buttons
    And I see the "Share link" button

  Scenario: Remove a product from the wishlist
    Given I am on my own wishlist page with at least one product
    When I click the remove button for a product
    Then the product is no longer visible in the wishlist

  Scenario: Empty state on a new wishlist
    Given I have created a wishlist but added no products
    When I navigate to the wishlist page
    Then I see the empty state message
