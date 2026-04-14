/**
 * @swagger
 * tags:
 *   name: Product Reviews
 *   description: API endpoints for managing product reviews and ratings
 */

/**
 * @swagger
 * /api/product-reviews:
 *   get:
 *     summary: Returns all product reviews
 *     tags: [Product Reviews]
 *     responses:
 *       200:
 *         description: List of all product reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductReview'
 *   post:
 *     summary: Create a new product review
 *     tags: [Product Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - reviewerName
 *               - rating
 *             properties:
 *               productId:
 *                 type: integer
 *               reviewerName:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               reviewText:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductReview'
 *
 * /api/product-reviews/{id}:
 *   get:
 *     summary: Get a review by ID
 *     tags: [Product Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductReview'
 *       404:
 *         description: Review not found
 *   delete:
 *     summary: Delete a review
 *     tags: [Product Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     responses:
 *       204:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
 */

/**
 * @swagger
 * /api/product-reviews/product/{productId}:
 *   get:
 *     summary: Get all reviews for a specific product
 *     tags: [Product Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: List of reviews for the product
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductReview'
 *
 * /api/product-reviews/product/{productId}/summary:
 *   get:
 *     summary: Get rating summary for a product
 *     tags: [Product Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Rating summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductRatingSummary'
 *
 * /api/product-reviews/summaries:
 *   get:
 *     summary: Get rating summaries for all products
 *     tags: [Product Reviews]
 *     responses:
 *       200:
 *         description: List of rating summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductRatingSummary'
 */

import express from 'express';
import { getProductReviewsRepository } from '../repositories/productReviewsRepo';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = express.Router();

// Create a new review
router.post('/', async (req, res, next) => {
  try {
    const { productId, reviewerName, rating, reviewText } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }
    if (!reviewerName || reviewerName.trim() === '') {
      throw new ValidationError('Reviewer name is required');
    }
    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    const repo = await getProductReviewsRepository();
    const newReview = await repo.create({ productId, reviewerName, rating, reviewText });
    res.status(201).json(newReview);
  } catch (error) {
    next(error);
  }
});

// Get all reviews
router.get('/', async (req, res, next) => {
  try {
    const repo = await getProductReviewsRepository();
    const reviews = await repo.findAll();
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

// Get all rating summaries
router.get('/summaries', async (req, res, next) => {
  try {
    const repo = await getProductReviewsRepository();
    const summaries = await repo.getAllRatingSummaries();
    res.json(summaries);
  } catch (error) {
    next(error);
  }
});

// Get reviews for a product
router.get('/product/:productId', async (req, res, next) => {
  try {
    const repo = await getProductReviewsRepository();
    const reviews = await repo.findByProductId(parseInt(req.params.productId));
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

// Get rating summary for a product
router.get('/product/:productId/summary', async (req, res, next) => {
  try {
    const repo = await getProductReviewsRepository();
    const summary = await repo.getRatingSummary(parseInt(req.params.productId));
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Get a review by ID
router.get('/:id', async (req, res, next) => {
  try {
    const repo = await getProductReviewsRepository();
    const review = await repo.findById(parseInt(req.params.id));
    if (review) {
      res.json(review);
    } else {
      res.status(404).send('Review not found');
    }
  } catch (error) {
    next(error);
  }
});

// Delete a review by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const repo = await getProductReviewsRepository();
    await repo.delete(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).send('Review not found');
    } else {
      next(error);
    }
  }
});

export default router;
