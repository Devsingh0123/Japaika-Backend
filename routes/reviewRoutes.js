import { Router } from 'express';
import { listPublicReviews, createPublicReview } from '../controllers/reviewController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public Customer Reviews Endpoints
router.get('/', listPublicReviews);
router.post('/', optionalAuth, createPublicReview);

export default router;
