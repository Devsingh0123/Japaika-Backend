import { Op } from 'sequelize';
import { Dosha } from '../models/index.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * 1. GET /api/v1/doshas
 * Public - Lists all published & active Vedic Dosha guides.
 * Supports optional filters: category, severity, search.
 */
export const listPublicDoshas = asyncHandler(async (req, res) => {
  const { category, severity, search } = req.query;

  const whereClause = {
    status: 'published',
    is_active: true
  };

  if (category && String(category).trim() && String(category).trim().toLowerCase() !== 'all') {
    whereClause.category = String(category).trim().toLowerCase();
  }

  if (severity && String(severity).trim() && String(severity).trim().toLowerCase() !== 'all') {
    whereClause.severity = String(severity).trim().toLowerCase();
  }

  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    whereClause[Op.or] = [
      { name: { [Op.like]: term } },
      { title: { [Op.like]: term } },
      { slug: { [Op.like]: term } }
    ];
  }

  const doshas = await Dosha.findAll({
    where: whereClause,
    attributes: [
      'id',
      'name',
      'sanskrit_name',
      'slug',
      'title',
      'subtitle',
      'category',
      'severity',
      'affected_planets',
      'affected_houses',
      'excerpt',
      'featured_image',
      'sort_order',
      'views_count',
      'created_at'
    ],
    order: [
      ['sort_order', 'ASC'],
      ['created_at', 'ASC']
    ]
  });

  res.status(200).json({
    success: true,
    message: 'Doshas list retrieved successfully.',
    data: {
      total: doshas.length,
      doshas
    }
  });
});

/**
 * 2. GET /api/v1/doshas/:slug
 * Public - Retrieves a single Vedic Dosha guide by slug, including full formation, effects, cancellations, and remedies.
 */
export const getPublicDoshaBySlug = asyncHandler(async (req, res, next) => {
  const rawSlug = req.params.slug;

  if (!rawSlug || !String(rawSlug).trim()) {
    return next(new AppError('Dosha slug is required.', 400));
  }

  const slug = String(rawSlug).trim().toLowerCase();

  const dosha = await Dosha.findOne({
    where: {
      slug,
      status: 'published',
      is_active: true
    }
  });

  if (!dosha) {
    return next(new AppError('The requested Dosha guide was not found or is currently unavailable.', 404));
  }

  // Increment view counter asynchronously without blocking response
  dosha.increment('views_count').catch(() => {});

  res.status(200).json({
    success: true,
    message: 'Dosha guide retrieved successfully.',
    data: {
      dosha
    }
  });
});
