import { Router } from 'express';
import { listPublicDoshas, getPublicDoshaBySlug } from '../controllers/doshaController.js';

const router = Router();

// Public Read-Only Dosha Endpoints (No auth required)
router.get('/', listPublicDoshas);
router.get('/:slug', getPublicDoshaBySlug);

export default router;
