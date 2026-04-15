/**
 * Repository for wishlists data access
 */

import { randomUUID } from 'crypto';
import { getDatabase, DatabaseConnection } from '../db/sqlite';
import { Wishlist, WishlistWithItems, WishlistItemWithProduct } from '../models/wishlist';
import { Product } from '../models/product';
import { handleDatabaseError, NotFoundError, ConflictError } from '../utils/errors';

type WishlistJoinRow = {
  wishlist_id: number;
  share_token: string;
  created_at: string;
  wishlist_item_id: number | null;
  added_at: string | null;
  product_id: number | null;
  supplier_id: number | null;
  product_name: string | null;
  product_description: string | null;
  product_price: number | null;
  product_sku: string | null;
  product_unit: string | null;
  product_img_name: string | null;
  product_discount: number | null;
};

export class WishlistsRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Create a new anonymous wishlist and return it with its share token
   */
  async create(): Promise<Wishlist> {
    try {
      const shareToken = randomUUID();
      const createdAt = new Date().toISOString();
      const result = await this.db.run(
        'INSERT INTO wishlists (share_token, created_at) VALUES (?, ?)',
        [shareToken, createdAt],
      );
      return {
        wishlistId: result.lastID!,
        shareToken,
        createdAt,
      };
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Find a wishlist by its share token, including all items with product details.
   * Uses a single JOIN query to avoid N+1.
   */
  async findByToken(token: string): Promise<WishlistWithItems | null> {
    try {
      const rows = await this.db.all<WishlistJoinRow>(
        `SELECT
          w.wishlist_id,
          w.share_token,
          w.created_at,
          wi.wishlist_item_id,
          wi.added_at,
          p.product_id,
          p.supplier_id,
          p.name        AS product_name,
          p.description AS product_description,
          p.price       AS product_price,
          p.sku         AS product_sku,
          p.unit        AS product_unit,
          p.img_name    AS product_img_name,
          p.discount    AS product_discount
        FROM wishlists w
        LEFT JOIN wishlist_items wi ON wi.wishlist_id = w.wishlist_id
        LEFT JOIN products p        ON p.product_id  = wi.product_id
        WHERE w.share_token = ?
        ORDER BY wi.added_at ASC`,
        [token],
      );

      if (rows.length === 0) return null;

      const first = rows[0];
      const wishlist: WishlistWithItems = {
        wishlistId: first.wishlist_id,
        shareToken: first.share_token,
        createdAt: first.created_at,
        items: [],
      };

      for (const row of rows) {
        if (row.wishlist_item_id !== null && row.product_id !== null) {
          const product: Product = {
            productId: row.product_id,
            supplierId: row.supplier_id!,
            name: row.product_name!,
            description: row.product_description ?? '',
            price: row.product_price!,
            sku: row.product_sku!,
            unit: row.product_unit!,
            imgName: row.product_img_name ?? '',
            discount: row.product_discount ?? undefined,
          };
          const item: WishlistItemWithProduct = {
            wishlistItemId: row.wishlist_item_id,
            productId: row.product_id,
            addedAt: row.added_at!,
            product,
          };
          wishlist.items.push(item);
        }
      }

      return wishlist;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Resolve a share token to a wishlist_id, or return null if not found.
   */
  async findIdByToken(token: string): Promise<number | null> {
    try {
      const row = await this.db.get<{ wishlist_id: number }>(
        'SELECT wishlist_id FROM wishlists WHERE share_token = ?',
        [token],
      );
      return row ? row.wishlist_id : null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Add a product to a wishlist. Throws ConflictError if already present.
   */
  async addItem(wishlistId: number, productId: number): Promise<void> {
    try {
      const addedAt = new Date().toISOString();
      await this.db.run(
        'INSERT INTO wishlist_items (wishlist_id, product_id, added_at) VALUES (?, ?, ?)',
        [wishlistId, productId, addedAt],
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw new ConflictError(`Product ${productId} is already in this wishlist`);
      }
      handleDatabaseError(error);
    }
  }

  /**
   * Remove a product from a wishlist. Throws NotFoundError if the item does not exist.
   */
  async removeItem(wishlistId: number, productId: number): Promise<void> {
    try {
      const result = await this.db.run(
        'DELETE FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?',
        [wishlistId, productId],
      );
      if (result.changes === 0) {
        throw new NotFoundError('WishlistItem', `${wishlistId}-${productId}`);
      }
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

// Factory function
async function createWishlistsRepository(isTest: boolean = false): Promise<WishlistsRepository> {
  const db = await getDatabase(isTest);
  return new WishlistsRepository(db);
}

// Singleton instance for default usage
let wishlistsRepo: WishlistsRepository | null = null;

export async function getWishlistsRepository(isTest: boolean = false): Promise<WishlistsRepository> {
  const isTestEnv = isTest || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  if (isTestEnv) {
    return createWishlistsRepository(true);
  }
  if (!wishlistsRepo) {
    wishlistsRepo = await createWishlistsRepository(false);
  }
  return wishlistsRepo;
}
