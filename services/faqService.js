import { Op } from 'sequelize';
import { Faq } from '../models/index.js';
import { AppError } from '../utils/appError.js';

export const DEFAULT_FAQS = [
  {
    question: 'How accurate are Japaika Vedic astrology calculations?',
    answer:
      'All birth charts and divisional charts (D-1 through D-60) on Japaika are computed using precision Swiss Ephemeris astronomical algorithms and the classical Lahiri (Chitrapaksha) Ayanamsa for sub-arcsecond planetary accuracy.',
    category: 'general',
    sort_order: 1,
    is_active: true
  },
  {
    question: 'What is the difference between Jyotish and Shastra AI engines?',
    answer:
      'Jyotish is your personal Vedic astrologer bound directly to your natal chart, divisional charts, and active Vimshottari Dasha timelines. Shastra is a free universal Vedic astrology encyclopedia that answers conceptual questions about yogas, doshas, nakshatras, and classical treatises.',
    category: 'general',
    sort_order: 2,
    is_active: true
  },
  {
    question: 'What if I do not know my exact time of birth?',
    answer:
      'You can toggle "I don\'t know my exact birth time" during onboarding. Japaika will generate a Chandra Kundli (Moon Chart) and Surya Kundli (Solar Chart) to provide accurate transit and planetary dasha insights.',
    category: 'general',
    sort_order: 3,
    is_active: true
  },
  {
    question: 'Do my purchased question credits or report credits expire?',
    answer:
      'No. Question credits and report credits purchased on Japaika never expire and remain permanently bound to your verified email account.',
    category: 'billing',
    sort_order: 4,
    is_active: true
  },
  {
    question: 'How long does it take to generate a personalized Vedic report?',
    answer:
      'Each multi-chapter Vedic blueprint (Career, Marriage, Wealth, or Annual Forecast) is dynamically authored from your exact planetary placements, Navamsa (D-9), Dasamsa (D-10), and Dasha periods in approximately 30 to 60 seconds.',
    category: 'reports',
    sort_order: 5,
    is_active: true
  }
];

let faqDefaultsEnsured = false;

export const ensureDefaultFaqs = async () => {
  if (faqDefaultsEnsured) return;

  const totalHistoricalCount = await Faq.count({ paranoid: false });
  if (totalHistoricalCount === 0) {
    await Faq.bulkCreate(DEFAULT_FAQS);
  }
  faqDefaultsEnsured = true;
};

const formatFaq = (faqInstance) => {
  const raw = faqInstance.toJSON ? faqInstance.toJSON() : faqInstance;
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
    category: raw.category || 'general',
    sort_order: Number(raw.sort_order ?? 0),
    is_active: Boolean(raw.is_active),
    created_at: raw.createdAt || raw.created_at || null,
    updated_at: raw.updatedAt || raw.updated_at || null
  };
};

/**
 * 1. List Active Public FAQs (Ordered by sort_order ASC, created_at ASC)
 * Supports optional `category` and `search` filters.
 */
export const getPublicFaqs = async ({ category = null, search = null } = {}) => {
  await ensureDefaultFaqs();

  const whereClause = {
    is_active: true
  };

  if (category && String(category).trim() && String(category).trim().toLowerCase() !== 'all') {
    whereClause.category = String(category).trim().toLowerCase();
  }

  if (search && String(search).trim()) {
    const cleanSearch = `%${String(search).trim()}%`;
    whereClause[Op.or] = [
      { question: { [Op.like]: cleanSearch } },
      { answer: { [Op.like]: cleanSearch } }
    ];
  }

  const [faqRows, categoryRows] = await Promise.all([
    Faq.findAll({
      where: whereClause,
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'ASC']
      ]
    }),
    Faq.findAll({
      where: { is_active: true },
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']]
    })
  ]);

  const faqs = faqRows.map(formatFaq);
  const categories = categoryRows
    .map((row) => row.category)
    .filter(Boolean);

  return {
    faqs,
    categories
  };
};

/**
 * 2. Get Single Active Public FAQ by ID
 */
export const getPublicFaqById = async (id) => {
  if (!id || !String(id).trim()) {
    throw new AppError('FAQ ID is required.', 400);
  }

  await ensureDefaultFaqs();

  const faq = await Faq.findOne({
    where: {
      id: String(id).trim(),
      is_active: true
    }
  });

  if (!faq) {
    throw new AppError('FAQ not found.', 404);
  }

  return formatFaq(faq);
};
