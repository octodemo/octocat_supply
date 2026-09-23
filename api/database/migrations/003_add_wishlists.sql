-- Migration 003: Add wishlists and wishlist_items tables

CREATE TABLE wishlists (
    wishlist_id  INTEGER PRIMARY KEY,
    share_token  TEXT    NOT NULL UNIQUE,
    created_at   TEXT    NOT NULL
);

CREATE TABLE wishlist_items (
    wishlist_item_id INTEGER PRIMARY KEY,
    wishlist_id      INTEGER NOT NULL,
    product_id       INTEGER NOT NULL,
    added_at         TEXT    NOT NULL,
    UNIQUE (wishlist_id, product_id),
    FOREIGN KEY (wishlist_id) REFERENCES wishlists(wishlist_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id)  REFERENCES products(product_id)   ON DELETE CASCADE
);

CREATE INDEX idx_wishlists_share_token        ON wishlists(share_token);
CREATE INDEX idx_wishlist_items_wishlist_id   ON wishlist_items(wishlist_id);
CREATE INDEX idx_wishlist_items_product_id    ON wishlist_items(product_id);
