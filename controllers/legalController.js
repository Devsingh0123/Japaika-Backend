import {
  getPublicLegalPages,
  getPublicLegalPageBySlug
} from '../services/legalService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * 1. GET /api/v1/legal-pages (and /api/v1/legal)
 * Public - List all active legal/policy pages
 */
export const listLegalPages = asyncHandler(async (req, res) => {
  const legalPages = await getPublicLegalPages();

  res.status(200).json({
    success: true,
    message: 'Legal pages retrieved successfully.',
    data: {
      legalPages
    }
  });
});

/**
 * 2. GET /api/v1/legal-pages/:slug (and /api/v1/legal/:slug)
 * Public - Get a single active legal page by slug
 * Supports 'privacy-policy', 'terms' (alias 'terms-and-conditions'), 'refund-policy', 'disclaimer'
 */
export const getLegalPageBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const legalPage = await getPublicLegalPageBySlug(slug);

  res.status(200).json({
    success: true,
    message: 'Legal page retrieved successfully.',
    data: {
      legalPage
    }
  });
});
