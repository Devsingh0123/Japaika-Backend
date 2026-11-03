import { Router } from 'express';
import {
  listLegalPages,
  getLegalPageBySlug
} from '../controllers/legalController.js';

const router = Router();

// Public Read-Only Legal Pages Endpoints (No auth required)
router.get('/', listLegalPages);
router.get('/:slug', getLegalPageBySlug);

export default router;
