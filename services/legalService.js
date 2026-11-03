import { LegalPage } from '../models/index.js';
import { AppError } from '../utils/appError.js';

export const DEFAULT_LEGAL_PAGES = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content:
      '<h2>1. Privacy Commitment</h2><p>At Japaika (<a href="https://japaika.com">japaika.com</a>), your birth details, natal charts, and personal consultations are treated with strict confidentiality. We use industry-standard encryption and never sell your personal data to third parties.</p><h2>2. Information We Collect</h2><p>We collect your email address for passwordless authentication and your birth date, time, and location solely to compute accurate Vedic astrological charts and personalized guidance.</p><h2>3. Contact Us</h2><p>For privacy inquiries, contact us at <a href="mailto:support@japaika.com">support@japaika.com</a>.</p>',
    is_active: true
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    content:
      '<h2>1. Acceptance of Terms</h2><p>By accessing and using Japaika (<a href="https://japaika.com">japaika.com</a>), you agree to abide by these Terms &amp; Conditions.</p><h2>2. Astrological Guidance Services</h2><p>Japaika provides Vedic astrological calculations, AI-assisted Jyotish and Shastra consultations, and personalized life reports for informational and spiritual guidance.</p><h2>3. User Accounts &amp; Credits</h2><p>Question credits and report credits purchased on Japaika are linked to your verified account and are non-transferable.</p>',
    is_active: true
  },
  {
    slug: 'refund-policy',
    title: 'Refund Policy',
    content:
      '<h2>1. Digital Astrological Services</h2><p>Because personalized Vedic birth charts, AI consultations, and custom-generated astrological reports are digital and computed immediately upon request, completed consultations and generated reports are generally non-refundable.</p><h2>2. Technical Errors &amp; Duplicate Charges</h2><p>If you experience a technical failure where credits were deducted without a response, or if an accidental duplicate payment occurred, please reach out to <a href="mailto:support@japaika.com">support@japaika.com</a> within 7 days for a prompt credit restoration or refund review.</p>',
    is_active: true
  },
  {
    slug: 'disclaimer',
    title: 'Disclaimer',
    content:
      '<h2>1. Astrological Guidance Disclaimer</h2><p>All Vedic astrological readings, birth chart analyses, horoscopes, and AI consultations provided on Japaika (<a href="https://japaika.com">japaika.com</a>) are based on classical Parashari and Jaimini Jyotish principles and are intended strictly for spiritual, educational, and self-reflection purposes.</p><h2>2. Not Professional Medical, Legal, or Financial Advice</h2><p>Astrological insights should never substitute professional medical, psychological, legal, or financial advice. Always consult qualified professionals for critical life, health, or investment decisions.</p>',
    is_active: true
  }
];

const SLUG_ALIASES = {
  'terms-and-conditions': 'terms',
  'terms-of-service': 'terms',
  'terms-of-use': 'terms',
  privacy: 'privacy-policy',
  'refunds': 'refund-policy',
  'refund': 'refund-policy',
  'cancellation-and-refund-policy': 'refund-policy'
};

export const normalizeLegalSlug = (slug = '') => {
  const clean = String(slug || '').trim().toLowerCase();
  return SLUG_ALIASES[clean] || clean;
};

const formatLegalPage = (pageInstance) => {
  const raw = pageInstance.toJSON ? pageInstance.toJSON() : pageInstance;
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    content: raw.content,
    is_active: Boolean(raw.is_active),
    created_at: raw.createdAt || raw.created_at || null,
    updated_at: raw.updatedAt || raw.updated_at || null
  };
};

let defaultsEnsured = false;

/**
 * Ensures the 4 core legal pages exist in `legal_pages` if not yet initialized.
 */
export const ensureDefaultLegalPages = async () => {
  if (defaultsEnsured) return;

  for (const item of DEFAULT_LEGAL_PAGES) {
    const existing = await LegalPage.findOne({
      where: { slug: item.slug },
      paranoid: false
    });
    if (!existing) {
      await LegalPage.create(item);
    }
  }
  defaultsEnsured = true;
};

/**
 * 1. List All Active Public Legal Pages
 */
export const getPublicLegalPages = async () => {
  await ensureDefaultLegalPages();

  const pages = await LegalPage.findAll({
    where: { is_active: true },
    order: [['created_at', 'ASC']]
  });

  return pages.map(formatLegalPage);
};

/**
 * 2. Get Single Active Public Legal Page by Slug
 */
export const getPublicLegalPageBySlug = async (slug) => {
  if (!slug || !String(slug).trim()) {
    throw new AppError('Legal page slug is required.', 400);
  }

  await ensureDefaultLegalPages();

  const normalizedSlug = normalizeLegalSlug(slug);

  const page = await LegalPage.findOne({
    where: {
      slug: normalizedSlug,
      is_active: true
    }
  });

  if (!page) {
    throw new AppError(`Legal page "${slug}" not found or is currently unavailable.`, 404);
  }

  return formatLegalPage(page);
};
