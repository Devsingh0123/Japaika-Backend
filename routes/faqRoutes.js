import { Router } from 'express';
import { listFaqs, getFaqById } from '../controllers/faqController.js';

const router = Router();

// Public Read-Only FAQ Endpoints (No auth required)
router.get('/', listFaqs);
router.get('/:id', getFaqById);

export default router;
