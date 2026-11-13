import { getPublicReviews, createReview } from '../services/reviewService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * 1. GET /api/v1/reviews
 * Public - Retrieves approved community reviews with category counts and pagination.
 */
export const listPublicReviews = asyncHandler(async (req, res) => {
  const { category, page, limit } = req.query;

  const result = await getPublicReviews({
    category,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    message: 'Reviews retrieved successfully.',
    data: result
  });
});

/**
 * 2. POST /api/v1/reviews
 * Public (Optional Auth) - Submits a new customer review.
 */
export const createPublicReview = asyncHandler(async (req, res) => {
  const review = await createReview({
    payload: req.body,
    user: req.user || null
  });

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully.',
    data: {
      review
    }
  });
});
