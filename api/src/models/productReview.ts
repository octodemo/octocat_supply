/**
 * @swagger
 * components:
 *   schemas:
 *     ProductReview:
 *       type: object
 *       required:
 *         - reviewId
 *         - productId
 *         - reviewerName
 *         - rating
 *       properties:
 *         reviewId:
 *           type: integer
 *           description: The unique identifier for the review
 *         productId:
 *           type: integer
 *           description: The ID of the product being reviewed
 *         reviewerName:
 *           type: string
 *           description: Name of the reviewer
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating from 1 to 5 stars
 *         reviewText:
 *           type: string
 *           description: The review comment text
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the review was created
 *     ProductRatingSummary:
 *       type: object
 *       properties:
 *         productId:
 *           type: integer
 *         averageRating:
 *           type: number
 *           format: float
 *         totalReviews:
 *           type: integer
 */
export interface ProductReview {
  reviewId: number;
  productId: number;
  reviewerName: string;
  rating: number;
  reviewText?: string;
  createdAt: string;
}

export interface ProductRatingSummary {
  productId: number;
  averageRating: number;
  totalReviews: number;
}
