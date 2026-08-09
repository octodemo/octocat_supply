import { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../../../api/config';
import { useTheme } from '../../../context/ThemeContext';

interface ProductReview {
  reviewId: number;
  productId: number;
  reviewerName: string;
  rating: number;
  reviewText?: string;
  createdAt: string;
}

interface ProductRatingSummary {
  productId: number;
  averageRating: number;
  totalReviews: number;
}

const fetchReviews = async (productId: number): Promise<ProductReview[]> => {
  const { data } = await axios.get(
    `${api.baseURL}${api.endpoints.productReviews}/product/${productId}`,
  );
  return data;
};

const fetchRatingSummary = async (productId: number): Promise<ProductRatingSummary> => {
  const { data } = await axios.get(
    `${api.baseURL}${api.endpoints.productReviews}/product/${productId}/summary`,
  );
  return data;
};

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClasses[size]} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function StarRatingInput({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <svg
            className={`w-8 h-8 transition-colors ${star <= (hover || rating) ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function ReviewSummaryBadge({ productId }: { productId: number }) {
  const { data: summary } = useQuery(
    ['ratingSummary', productId],
    () => fetchRatingSummary(productId),
    { staleTime: 30000 },
  );

  if (!summary || summary.totalReviews === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <StarRating rating={Math.round(summary.averageRating)} size="sm" />
      <span className="text-sm text-gray-500">
        {summary.averageRating.toFixed(1)} ({summary.totalReviews})
      </span>
    </div>
  );
}

export function ReviewList({ productId }: { productId: number }) {
  const { darkMode } = useTheme();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewText, setNewReviewText] = useState('');

  const {
    data: reviews,
    isLoading,
    error,
  } = useQuery(['reviews', productId], () => fetchReviews(productId));

  const { data: summary } = useQuery(
    ['ratingSummary', productId],
    () => fetchRatingSummary(productId),
  );

  const createReviewMutation = useMutation(
    async (review: { productId: number; reviewerName: string; rating: number; reviewText: string }) => {
      const { data } = await axios.post(
        `${api.baseURL}${api.endpoints.productReviews}`,
        review,
      );
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reviews', productId]);
        queryClient.invalidateQueries(['ratingSummary', productId]);
        setShowForm(false);
        setNewRating(0);
        setNewReviewerName('');
        setNewReviewText('');
      },
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRating === 0 || !newReviewerName.trim()) return;
    createReviewMutation.mutate({
      productId,
      reviewerName: newReviewerName.trim(),
      rating: newRating,
      reviewText: newReviewText.trim(),
    });
  };

  if (isLoading) {
    return <div className="animate-pulse h-20 bg-gray-200 rounded"></div>;
  }

  if (error) {
    return <div className="text-red-500 text-sm">Failed to load reviews</div>;
  }

  return (
    <div className="mt-6">
      {/* Summary */}
      {summary && summary.totalReviews > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <StarRating rating={Math.round(summary.averageRating)} size="lg" />
          <span className={`text-lg font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
            {summary.averageRating.toFixed(1)}
          </span>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            ({summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''})
          </span>
        </div>
      )}

      {/* Add Review Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors"
        >
          Write a Review
        </button>
      )}

      {/* Review Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className={`mb-6 p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
        >
          <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
            Write a Review
          </h4>

          <div className="mb-3">
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Your Name
            </label>
            <input
              type="text"
              value={newReviewerName}
              onChange={(e) => setNewReviewerName(e.target.value)}
              placeholder="Enter your name"
              className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-800 text-light border-gray-600' : 'bg-white text-gray-800 border-gray-300'} focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none`}
              required
            />
          </div>

          <div className="mb-3">
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Rating
            </label>
            <StarRatingInput rating={newRating} onRate={setNewRating} />
          </div>

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Review (optional)
            </label>
            <textarea
              value={newReviewText}
              onChange={(e) => setNewReviewText(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-800 text-light border-gray-600' : 'bg-white text-gray-800 border-gray-300'} focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none`}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={newRating === 0 || !newReviewerName.trim() || createReviewMutation.isLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createReviewMutation.isLoading ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={`px-4 py-2 rounded-lg border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-600' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} transition-colors`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Review List */}
      {reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.reviewId}
              className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                    {review.reviewerName}
                  </span>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.reviewText && (
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {review.reviewText}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No reviews yet. Be the first to review this product!
          </p>
        )
      )}
    </div>
  );
}
