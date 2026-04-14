/**
 * Repository for product reviews data access
 */

import { getDatabase, DatabaseConnection } from '../db/sqlite';
import { ProductReview, ProductRatingSummary } from '../models/productReview';
import { handleDatabaseError, NotFoundError } from '../utils/errors';
import { buildInsertSQL, objectToCamelCase, mapDatabaseRows, DatabaseRow } from '../utils/sql';

export class ProductReviewsRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Get all reviews
   */
  async findAll(): Promise<ProductReview[]> {
    try {
      const rows = await this.db.all<DatabaseRow>('SELECT * FROM product_reviews ORDER BY created_at DESC');
      return mapDatabaseRows<ProductReview>(rows);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Get review by ID
   */
  async findById(id: number): Promise<ProductReview | null> {
    try {
      const row = await this.db.get<DatabaseRow>('SELECT * FROM product_reviews WHERE review_id = ?', [id]);
      return row ? objectToCamelCase<ProductReview>(row) : null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Get all reviews for a product
   */
  async findByProductId(productId: number): Promise<ProductReview[]> {
    try {
      const rows = await this.db.all<DatabaseRow>(
        'SELECT * FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC',
        [productId],
      );
      return mapDatabaseRows<ProductReview>(rows);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Get average rating and total reviews for a product
   */
  async getRatingSummary(productId: number): Promise<ProductRatingSummary> {
    try {
      const row = await this.db.get<DatabaseRow>(
        'SELECT product_id, COALESCE(AVG(rating), 0) as average_rating, COUNT(*) as total_reviews FROM product_reviews WHERE product_id = ? GROUP BY product_id',
        [productId],
      );
      if (row) {
        return objectToCamelCase<ProductRatingSummary>(row);
      }
      return { productId, averageRating: 0, totalReviews: 0 };
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Get rating summaries for all products that have reviews
   */
  async getAllRatingSummaries(): Promise<ProductRatingSummary[]> {
    try {
      const rows = await this.db.all<DatabaseRow>(
        'SELECT product_id, AVG(rating) as average_rating, COUNT(*) as total_reviews FROM product_reviews GROUP BY product_id',
      );
      return mapDatabaseRows<ProductRatingSummary>(rows);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Create a new review
   */
  async create(review: Omit<ProductReview, 'reviewId' | 'createdAt'>): Promise<ProductReview> {
    try {
      const { sql, values } = buildInsertSQL('product_reviews', review);
      const result = await this.db.run(sql, values);

      const createdReview = await this.findById(result.lastID || 0);
      if (!createdReview) {
        throw new Error('Failed to retrieve created review');
      }

      return createdReview;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Delete review by ID
   */
  async delete(id: number): Promise<void> {
    try {
      const result = await this.db.run('DELETE FROM product_reviews WHERE review_id = ?', [id]);

      if (result.changes === 0) {
        throw new NotFoundError('ProductReview', id);
      }
    } catch (error) {
      handleDatabaseError(error, 'ProductReview', id);
    }
  }

  /**
   * Check if review exists
   */
  async exists(id: number): Promise<boolean> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM product_reviews WHERE review_id = ?',
        [id],
      );
      return (result?.count || 0) > 0;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

// Factory function to create repository instance
export async function createProductReviewsRepository(
  isTest: boolean = false,
): Promise<ProductReviewsRepository> {
  const db = await getDatabase(isTest);
  return new ProductReviewsRepository(db);
}

// Singleton instance for default usage
let productReviewsRepo: ProductReviewsRepository | null = null;

export async function getProductReviewsRepository(isTest: boolean = false): Promise<ProductReviewsRepository> {
  const isTestEnv = isTest || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  if (isTestEnv) {
    return createProductReviewsRepository(true);
  }
  if (!productReviewsRepo) {
    productReviewsRepo = await createProductReviewsRepository(false);
  }
  return productReviewsRepo;
}
