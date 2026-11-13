import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = await import('../config/db.js');
const { Review, User } = await import('../models/index.js');
const { listPublicReviews, createPublicReview } = await import('../controllers/reviewController.js');

function invokeHandler(handler, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ statusCode: this.statusCode, body: data });
      }
    };
    handler(req, res, (err) => {
      if (err) {
        resolve({
          statusCode: err.statusCode || 500,
          body: { success: false, message: err.message }
        });
      }
    });
  });
}

try {
  await sequelize.authenticate();
  await Review.sync({ alter: true });

  // Clear table first to test fresh auto-seeding of the 6 community reviews
  await Review.destroy({ where: {}, force: true });

  // 1. Test GET /api/v1/reviews (auto-seeds 6 reviews)
  const getAllRes = await invokeHandler(listPublicReviews, { query: {} });
  assert.strictEqual(getAllRes.statusCode, 200, 'GET /api/v1/reviews should return 200');
  assert.strictEqual(getAllRes.body.success, true);
  assert.strictEqual(getAllRes.body.data.reviews.length, 6, 'Should auto-seed 6 initial reviews');
  assert.deepStrictEqual(getAllRes.body.data.counts, {
    all: 6,
    jyotish: 2,
    reports: 1,
    kundli: 1,
    compatibility: 1,
    shastra: 1
  });
  assert.strictEqual(getAllRes.body.data.reviews[0].author, 'Aarav Sharma');
  assert.strictEqual(getAllRes.body.data.reviews[0].category, 'Jyotish');
  assert.strictEqual(getAllRes.body.data.reviews[0].categoryId, 'jyotish');
  assert.strictEqual(getAllRes.body.data.reviews[0].date, 'Nov 2026');
  console.log('✓ 1. Auto-seeding and GET /api/v1/reviews passed.');

  // 2. Test GET /api/v1/reviews?category=jyotish
  const getFilteredRes = await invokeHandler(listPublicReviews, {
    query: { category: 'jyotish', page: '1', limit: '10' }
  });
  assert.strictEqual(getFilteredRes.statusCode, 200);
  assert.strictEqual(getFilteredRes.body.data.reviews.length, 2, 'Should return 2 jyotish reviews');
  assert.strictEqual(getFilteredRes.body.data.counts.all, 6, 'Global counts.all should remain 6');
  assert.strictEqual(getFilteredRes.body.data.counts.reports, 1, 'Global counts.reports should remain 1');
  console.log('✓ 2. Category filtering & global counts passed.');

  // 3. Test POST /api/v1/reviews as Guest (user = null)
  const guestPostRes = await invokeHandler(createPublicReview, {
    user: null,
    body: {
      firstName: 'Meera',
      lastName: 'Nair',
      location: '',
      rating: 5,
      categoryId: 'reports',
      content: 'The marriage compatibility and Navamsa analysis was remarkably accurate and insightful!'
    }
  });
  assert.strictEqual(guestPostRes.statusCode, 201, 'POST /api/v1/reviews should return 201');
  const guestReview = guestPostRes.body.data.review;
  assert.strictEqual(guestReview.author, 'Meera Nair');
  assert.strictEqual(guestReview.firstName, 'Meera');
  assert.strictEqual(guestReview.lastName, 'Nair');
  assert.strictEqual(guestReview.location, 'India', 'Empty location should default to India');
  assert.strictEqual(guestReview.rating, 5);
  assert.strictEqual(guestReview.category, 'Reports');
  assert.strictEqual(guestReview.categoryId, 'reports');
  const dbGuestRow = await Review.findByPk(guestReview.id);
  assert.strictEqual(dbGuestRow.user_id, null, 'Guest review should have user_id = null');
  console.log('✓ 3. Guest review submission passed.');

  // 4. Test POST /api/v1/reviews as Authenticated User
  const existingUser = await User.findOne();
  let authReviewId = null;
  if (existingUser) {
    const authPostRes = await invokeHandler(createPublicReview, {
      user: existingUser,
      body: {
        first_name: 'Rohan',
        last_name: 'Verma',
        location: 'Jaipur, India',
        rating: 4,
        category: 'kundli',
        content: 'Planetary longitudes and Nakshatra padas matched my traditional panchangam exactly.'
      }
    });
    assert.strictEqual(authPostRes.statusCode, 201);
    authReviewId = authPostRes.body.data.review.id;
    const dbAuthRow = await Review.findByPk(authReviewId);
    assert.strictEqual(dbAuthRow.user_id, existingUser.id, 'Authenticated review should store user_id');
    console.log('✓ 4. Authenticated user review submission passed.');
  }

  // 5. Test Manual Validation Errors (400 Bad Request)
  const badNameRes = await invokeHandler(createPublicReview, {
    user: null,
    body: { firstName: '   ', rating: 5, category: 'jyotish', content: 'Valid length content here.' }
  });
  assert.strictEqual(badNameRes.statusCode, 400, 'Empty firstName should return 400');

  const shortContentRes = await invokeHandler(createPublicReview, {
    user: null,
    body: { firstName: 'Aarav', rating: 5, category: 'jyotish', content: 'Too short' }
  });
  assert.strictEqual(shortContentRes.statusCode, 400, 'Content < 10 chars should return 400');

  const badRatingRes = await invokeHandler(createPublicReview, {
    user: null,
    body: { firstName: 'Aarav', rating: 6, category: 'jyotish', content: 'Valid review content with more than ten characters.' }
  });
  assert.strictEqual(badRatingRes.statusCode, 400, 'Rating > 5 should return 400');

  const badCategoryRes = await invokeHandler(createPublicReview, {
    user: null,
    body: { firstName: 'Aarav', rating: 5, category: 'unknown_cat', content: 'Valid review content with more than ten characters.' }
  });
  assert.strictEqual(badCategoryRes.statusCode, 400, 'Invalid category should return 400');
  console.log('✓ 5. Manual validation error checks (400 Bad Request) passed.');

  // Clean up the 2 temporary test reviews so only the 6 initial community reviews remain
  await Review.destroy({ where: { id: guestReview.id }, force: true });
  if (authReviewId) {
    await Review.destroy({ where: { id: authReviewId }, force: true });
  }

  const finalCount = await Review.count();
  assert.strictEqual(finalCount, 6, 'Database should have the 6 clean community reviews');
  console.log(`\nALL REVIEWS MODULE TESTS PASSED! (${finalCount} seeded reviews ready in DB)`);

  await sequelize.close();
  process.exit(0);
} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
}
