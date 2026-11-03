import { getPublicFaqs, getPublicFaqById } from '../services/faqService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * 1. GET /api/v1/faqs
 * Public - List all active FAQs ordered by sort_order ASC, created_at ASC
 */
export const listFaqs = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const data = await getPublicFaqs({ category, search });

  res.status(200).json({
    success: true,
    message: 'FAQs retrieved successfully.',
    data
  });
});

/**
 * 2. GET /api/v1/faqs/:id
 * Public - Get a single active FAQ by ID
 */
export const getFaqById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const faq = await getPublicFaqById(id);

  res.status(200).json({
    success: true,
    message: 'FAQ retrieved successfully.',
    data: {
      faq
    }
  });
});
