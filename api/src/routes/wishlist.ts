/**
 * @swagger
 * tags:
 *   name: Wishlists
 *   description: Anonymous shareable product wishlists
 */

/**
 * @swagger
 * /api/wishlists:
 *   post:
 *     summary: Create a new anonymous wishlist
 *     tags: [Wishlists]
 *     responses:
 *       201:
 *         description: Wishlist created – returns the share token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - shareToken
 *               properties:
 *                 shareToken:
 *                   type: string
 *                   description: UUID token used to access and share the wishlist
 *
 * /api/wishlists/{token}:
 *   get:
 *     summary: Get a wishlist with all its products
 *     tags: [Wishlists]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The share token of the wishlist
 *     responses:
 *       200:
 *         description: Wishlist with embedded product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WishlistWithItems'
 *       404:
 *         description: Wishlist not found
 *
 * /api/wishlists/{token}/items:
 *   post:
 *     summary: Add a product to a wishlist
 *     tags: [Wishlists]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Product added to wishlist
 *       400:
 *         description: Invalid productId
 *       404:
 *         description: Wishlist not found
 *       409:
 *         description: Product already in wishlist
 *
 * /api/wishlists/{token}/items/{productId}:
 *   delete:
 *     summary: Remove a product from a wishlist
 *     tags: [Wishlists]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Product removed from wishlist
 *       404:
 *         description: Wishlist or item not found
 */

import express from 'express';
import { getWishlistsRepository } from '../repositories/wishlistsRepo';
import { NotFoundError, ValidationError } from '../utils/errors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const router = express.Router();

// Create a new wishlist
router.post('/', async (req, res, next) => {
  try {
    const repo = await getWishlistsRepository();
    const wishlist = await repo.create();
    res.status(201).json({ shareToken: wishlist.shareToken });
  } catch (error) {
    next(error);
  }
});

// Get a wishlist by share token
router.get('/:token', async (req, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.token)) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    const repo = await getWishlistsRepository();
    const wishlist = await repo.findByToken(req.params.token);
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    res.json(wishlist);
  } catch (error) {
    next(error);
  }
});

// Add a product to a wishlist
router.post('/:token/items', async (req, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.token)) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    const { productId } = req.body as { productId: unknown };
    if (productId === undefined || productId === null || typeof productId !== 'number' || !Number.isInteger(productId)) {
      throw new ValidationError('productId must be an integer');
    }
    const repo = await getWishlistsRepository();
    const wishlistId = await repo.findIdByToken(req.params.token);
    if (wishlistId === null) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    await repo.addItem(wishlistId, productId);
    res.status(201).json({ message: 'Product added to wishlist' });
  } catch (error) {
    next(error);
  }
});

// Remove a product from a wishlist
router.delete('/:token/items/:productId', async (req, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.token)) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) {
      throw new ValidationError('productId must be an integer');
    }
    const repo = await getWishlistsRepository();
    const wishlistId = await repo.findIdByToken(req.params.token);
    if (wishlistId === null) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    await repo.removeItem(wishlistId, productId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }
    next(error);
  }
});

export default router;
