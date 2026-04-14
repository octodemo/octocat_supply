import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductReviewsRepository } from './productReviewsRepo';
import { NotFoundError } from '../utils/errors';

// Mock the getDatabase function first
vi.mock('../db/sqlite', () => ({
    getDatabase: vi.fn()
}));

import { getDatabase } from '../db/sqlite';

describe('ProductReviewsRepository', () => {
    let repository: ProductReviewsRepository;
    let mockDb: any;

    beforeEach(() => {
        mockDb = {
            db: {} as any,
            run: vi.fn(),
            get: vi.fn(),
            all: vi.fn(),
            close: vi.fn()
        };

        (getDatabase as any).mockResolvedValue(mockDb);
        repository = new ProductReviewsRepository(mockDb);
        vi.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all reviews', async () => {
            const mockResults = [
                { review_id: 1, product_id: 1, reviewer_name: 'CatLover42', rating: 5, review_text: 'Great!', created_at: '2026-01-15 10:30:00' }
            ];
            mockDb.all.mockResolvedValue(mockResults);

            const result = await repository.findAll();

            expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM product_reviews ORDER BY created_at DESC');
            expect(result).toHaveLength(1);
            expect(result[0].reviewId).toBe(1);
            expect(result[0].reviewerName).toBe('CatLover42');
        });

        it('should return empty array when no reviews exist', async () => {
            mockDb.all.mockResolvedValue([]);

            const result = await repository.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('should return review when found', async () => {
            const mockResult = {
                review_id: 1,
                product_id: 1,
                reviewer_name: 'CatLover42',
                rating: 5,
                review_text: 'Great product!',
                created_at: '2026-01-15 10:30:00'
            };
            mockDb.get.mockResolvedValue(mockResult);

            const result = await repository.findById(1);

            expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM product_reviews WHERE review_id = ?', [1]);
            expect(result?.reviewId).toBe(1);
            expect(result?.rating).toBe(5);
        });

        it('should return null when review not found', async () => {
            mockDb.get.mockResolvedValue(undefined);

            const result = await repository.findById(999);

            expect(result).toBeNull();
        });
    });

    describe('findByProductId', () => {
        it('should return reviews for a specific product', async () => {
            const mockResults = [
                { review_id: 1, product_id: 1, reviewer_name: 'CatLover42', rating: 5, review_text: 'Great!', created_at: '2026-01-15 10:30:00' },
                { review_id: 2, product_id: 1, reviewer_name: 'WhiskersMom', rating: 4, review_text: 'Good', created_at: '2026-02-01 14:22:00' }
            ];
            mockDb.all.mockResolvedValue(mockResults);

            const result = await repository.findByProductId(1);

            expect(mockDb.all).toHaveBeenCalledWith(
                'SELECT * FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC',
                [1]
            );
            expect(result).toHaveLength(2);
        });
    });

    describe('getRatingSummary', () => {
        it('should return rating summary for a product', async () => {
            const mockResult = { product_id: 1, average_rating: 4.5, total_reviews: 3 };
            mockDb.get.mockResolvedValue(mockResult);

            const result = await repository.getRatingSummary(1);

            expect(result.averageRating).toBe(4.5);
            expect(result.totalReviews).toBe(3);
        });

        it('should return zero values when no reviews exist', async () => {
            mockDb.get.mockResolvedValue(undefined);

            const result = await repository.getRatingSummary(999);

            expect(result.averageRating).toBe(0);
            expect(result.totalReviews).toBe(0);
        });
    });

    describe('create', () => {
        it('should create a new review and return it', async () => {
            const newReview = {
                productId: 1,
                reviewerName: 'NewReviewer',
                rating: 4,
                reviewText: 'Nice product!'
            };

            mockDb.run.mockResolvedValue({ lastID: 13, changes: 1 });
            mockDb.get.mockResolvedValue({
                review_id: 13,
                product_id: 1,
                reviewer_name: 'NewReviewer',
                rating: 4,
                review_text: 'Nice product!',
                created_at: '2026-04-14 12:00:00'
            });

            const result = await repository.create(newReview);

            expect(mockDb.run).toHaveBeenCalled();
            expect(result.reviewId).toBe(13);
            expect(result.reviewerName).toBe('NewReviewer');
            expect(result.rating).toBe(4);
        });
    });

    describe('delete', () => {
        it('should delete a review', async () => {
            mockDb.run.mockResolvedValue({ changes: 1 });

            await repository.delete(1);

            expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM product_reviews WHERE review_id = ?', [1]);
        });

        it('should throw NotFoundError when review does not exist', async () => {
            mockDb.run.mockResolvedValue({ changes: 0 });

            await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
        });
    });

    describe('exists', () => {
        it('should return true when review exists', async () => {
            mockDb.get.mockResolvedValue({ count: 1 });

            const result = await repository.exists(1);

            expect(result).toBe(true);
        });

        it('should return false when review does not exist', async () => {
            mockDb.get.mockResolvedValue({ count: 0 });

            const result = await repository.exists(999);

            expect(result).toBe(false);
        });
    });
});
