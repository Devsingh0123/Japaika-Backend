import { sequelize } from '../config/db.js';
import { Review } from '../models/index.js';
import { AppError } from '../utils/appError.js';

export const REVIEW_CATEGORY_LABELS = {
  jyotish: 'Jyotish',
  reports: 'Reports',
  kundli: 'Kundli',
  compatibility: 'Compatibility',
  shastra: 'Shastra'
};

export const VALID_REVIEW_CATEGORIES = Object.keys(REVIEW_CATEGORY_LABELS);

export const DEFAULT_REVIEWS = [
  {
    first_name: 'Aarav',
    last_name: 'Sharma',
    location: 'Bengaluru, India',
    rating: 5,
    category: 'jyotish',
    content:
      'I was skeptical of AI astrology tools at first, but Jyotish actually read my D1 and D9 placements accurately. It pinpointed my Rahu-Jupiter transit window and explained why my career switch was delayed without giving generic advice.',
    is_approved: true,
    createdAt: new Date('2026-11-10T10:00:00.000Z'),
    updatedAt: new Date('2026-11-10T10:00:00.000Z')
  },
  {
    first_name: 'Priyanka',
    last_name: 'Deshmukh',
    location: 'Pune, India',
    rating: 5,
    category: 'reports',
    content:
      'Unlocked the career and wealth report last week. The breakdown of my 2nd and 11th houses was clear, well-structured, and easy to follow. Definitely worth it if you want a detailed written reading you can refer back to.',
    is_approved: true,
    createdAt: new Date('2026-10-22T10:00:00.000Z'),
    updatedAt: new Date('2026-10-22T10:00:00.000Z')
  },
  {
    first_name: 'Vikramaditya',
    last_name: 'Rao',
    location: 'Hyderabad, India',
    rating: 5,
    category: 'kundli',
    content:
      "Checked the planetary degrees and Vimshottari Dasha dates against my family astrologer's manual calculations and they matched to the minute. Clean interface with zero clutter.",
    is_approved: true,
    createdAt: new Date('2026-10-08T10:00:00.000Z'),
    updatedAt: new Date('2026-10-08T10:00:00.000Z')
  },
  {
    first_name: 'Ananya',
    last_name: 'Singhania',
    location: 'New Delhi, India',
    rating: 5,
    category: 'compatibility',
    content:
      'Used the Kundli Milan calculator before our families met. Instead of just showing a raw Ashtakoot score out of 36, it explained the actual planetary friendship and where we complement each other.',
    is_approved: true,
    createdAt: new Date('2026-09-19T10:00:00.000Z'),
    updatedAt: new Date('2026-09-19T10:00:00.000Z')
  },
  {
    first_name: 'Rajesh',
    last_name: 'Kulkarni',
    location: 'Mumbai, India',
    rating: 4,
    category: 'shastra',
    content:
      'Shastra is great when you just want to understand Vedic concepts like Sade Sati or Manglik cancellation rules without any fear-mongering. Straightforward and grounded in classical texts.',
    is_approved: true,
    createdAt: new Date('2026-09-05T10:00:00.000Z'),
    updatedAt: new Date('2026-09-05T10:00:00.000Z')
  },
  {
    first_name: 'Michael',
    last_name: 'Chang',
    location: 'San Francisco, USA',
    rating: 5,
    category: 'jyotish',
    content:
      'Hard to find Vedic astrology explained in clear, practical English without losing the traditional depth. Asked three follow-up questions about my dasha timeline and got very specific answers.',
    is_approved: true,
    createdAt: new Date('2026-08-18T10:00:00.000Z'),
    updatedAt: new Date('2026-08-18T10:00:00.000Z')
  }
];

let defaultsEnsured = false;

/**
 * Formats a Date object or ISO timestamp as "MMM YYYY" (e.g. "Nov 2026").
 */
export const formatReviewDate = (dateVal) => {
  if (!dateVal) return '';
  const dateObj = new Date(dateVal);
  if (Number.isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
};

/**
 * Formats a Sequelize Review record into the frontend ReviewCard/ReviewPage shape.
 */
export const formatReview = (reviewInstance) => {
  const raw = reviewInstance.toJSON ? reviewInstance.toJSON() : reviewInstance;
  const firstName = String(raw.first_name || '').trim();
  const lastName = raw.last_name ? String(raw.last_name).trim() : '';
  const author = [firstName, lastName].filter(Boolean).join(' ');
  const categoryId = String(raw.category || 'jyotish').toLowerCase();
  const createdAtDate = raw.createdAt || raw.created_at || new Date();

  return {
    id: raw.id,
    author,
    firstName,
    lastName,
    location: raw.location || 'India',
    rating: Number(raw.rating),
    category: REVIEW_CATEGORY_LABELS[categoryId] || 'Jyotish',
    categoryId,
    content: raw.content,
    date: formatReviewDate(createdAtDate),
    createdAt: new Date(createdAtDate).toISOString()
  };
};

/**
 * Ensures the 6 initial community reviews are seeded if the `reviews` table is empty.
 */
export const ensureDefaultReviews = async () => {
  if (defaultsEnsured) return;

  const existingCount = await Review.count({ paranoid: false });
  if (existingCount === 0) {
    await Review.bulkCreate(DEFAULT_REVIEWS, { silent: true });
  }

  defaultsEnsured = true;
};

/**
 * 1. Fetch paginated public approved reviews and category counts.
 */
export const getPublicReviews = async ({ category = 'all', page = 1, limit = 20 } = {}) => {
  await ensureDefaultReviews();

  const normalizedCategory = category ? String(category).trim().toLowerCase() : 'all';

  if (normalizedCategory !== 'all' && !VALID_REVIEW_CATEGORIES.includes(normalizedCategory)) {
    throw new AppError(
      `Invalid category "${category}". Allowed values are: all, ${VALID_REVIEW_CATEGORIES.join(', ')}.`,
      400
    );
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (parsedPage - 1) * parsedLimit;

  const whereClause = {
    is_approved: true
  };

  if (normalizedCategory !== 'all') {
    whereClause.category = normalizedCategory;
  }

  const [{ count: totalFiltered, rows }, groupedCounts] = await Promise.all([
    Review.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parsedLimit,
      offset
    }),
    Review.findAll({
      where: { is_approved: true },
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    })
  ]);

  const counts = {
    all: 0,
    jyotish: 0,
    reports: 0,
    kundli: 0,
    compatibility: 0,
    shastra: 0
  };

  for (const row of groupedCounts) {
    const catKey = String(row.category || '').toLowerCase();
    const c = Number(row.count) || 0;
    if (catKey in counts) {
      counts[catKey] = c;
    }
    counts.all += c;
  }

  return {
    reviews: rows.map(formatReview),
    counts,
    pagination: {
      total: totalFiltered,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.max(1, Math.ceil(totalFiltered / parsedLimit))
    }
  };
};

/**
 * 2. Validate and create a new public review (supports logged-in user or guest).
 */
export const createReview = async ({ payload = {}, user = null }) => {
  await ensureDefaultReviews();

  const rawFirstName = payload.firstName ?? payload.first_name ?? '';
  const rawLastName = payload.lastName ?? payload.last_name ?? '';
  const rawLocation = payload.location ?? '';
  const rawRating = payload.rating;
  const rawCategory = payload.category ?? payload.categoryId ?? payload.category_id ?? '';
  const rawContent = payload.content ?? '';

  // 1. Validate firstName (required, trimmed string, 1-40 chars)
  const firstName = typeof rawFirstName === 'string' ? rawFirstName.trim() : '';
  if (!firstName) {
    throw new AppError('First name is required.', 400);
  }
  if (firstName.length > 40) {
    throw new AppError('First name must not exceed 40 characters.', 400);
  }

  // 2. Validate lastName (optional, trimmed string, max 40 chars)
  const lastName = typeof rawLastName === 'string' ? rawLastName.trim() : '';
  if (lastName.length > 40) {
    throw new AppError('Last name must not exceed 40 characters.', 400);
  }

  // 3. Validate location (optional, trimmed string, max 60 chars, default 'India')
  const trimmedLocation = typeof rawLocation === 'string' ? rawLocation.trim() : '';
  if (trimmedLocation.length > 60) {
    throw new AppError('Location must not exceed 60 characters.', 400);
  }
  const location = trimmedLocation || 'India';

  // 4. Validate rating (required integer between 1 and 5)
  const ratingNum = Number(rawRating);
  if (rawRating === undefined || rawRating === null || rawRating === '' || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new AppError('Rating must be an integer between 1 and 5.', 400);
  }

  // 5. Validate category (required, one of ['jyotish', 'reports', 'kundli', 'compatibility', 'shastra'])
  const category = typeof rawCategory === 'string' ? rawCategory.trim().toLowerCase() : '';
  if (!VALID_REVIEW_CATEGORIES.includes(category)) {
    throw new AppError(
      `Invalid category. Must be one of: ${VALID_REVIEW_CATEGORIES.join(', ')}.`,
      400
    );
  }

  // 6. Validate content (required, trimmed string, 10-600 chars)
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (!content || content.length < 10) {
    throw new AppError('Review content must be at least 10 characters long.', 400);
  }
  if (content.length > 600) {
    throw new AppError('Review content must not exceed 600 characters.', 400);
  }

  const created = await Review.create({
    user_id: user?.id || null,
    first_name: firstName,
    last_name: lastName || null,
    location,
    rating: ratingNum,
    category,
    content,
    is_approved: true
  });

  return formatReview(created);
};
