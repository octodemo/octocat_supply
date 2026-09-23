/**
 * @swagger
 * components:
 *   schemas:
 *     Wishlist:
 *       type: object
 *       required:
 *         - wishlistId
 *         - shareToken
 *         - createdAt
 *       properties:
 *         wishlistId:
 *           type: integer
 *           description: The unique identifier for the wishlist
 *         shareToken:
 *           type: string
 *           description: The UUID token used to identify and share this wishlist
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: ISO 8601 timestamp when the wishlist was created
 *
 *     WishlistItemWithProduct:
 *       type: object
 *       required:
 *         - wishlistItemId
 *         - productId
 *         - addedAt
 *         - product
 *       properties:
 *         wishlistItemId:
 *           type: integer
 *         productId:
 *           type: integer
 *         addedAt:
 *           type: string
 *           format: date-time
 *         product:
 *           $ref: '#/components/schemas/Product'
 *
 *     WishlistWithItems:
 *       allOf:
 *         - $ref: '#/components/schemas/Wishlist'
 *         - type: object
 *           required:
 *             - items
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WishlistItemWithProduct'
 */

import { Product } from './product';

export interface Wishlist {
  wishlistId: number;
  shareToken: string;
  createdAt: string;
}

export interface WishlistItemWithProduct {
  wishlistItemId: number;
  productId: number;
  addedAt: string;
  product: Product;
}

export interface WishlistWithItems extends Wishlist {
  items: WishlistItemWithProduct[];
}
