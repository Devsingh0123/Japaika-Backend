import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Dosha } = await import('../models/index.js');
const { listPublicDoshas, getPublicDoshaBySlug } = await import('../controllers/doshaController.js');

// Mock Express async handler invocation helper
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
        resolve({ statusCode: err.statusCode || 500, error: err });
      }
    });
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('--- Running Public Vedic Dosha Guides Unit Tests ---');
  console.log('====================================================\n');

  // Test 1: Model Registration & Export
  console.log('Test 1: Verifying Model Registration in models/index.js...');
  assert(Dosha, 'Dosha model must be exported from models/index.js');
  const count = await Dosha.count({ where: { status: 'published', is_active: true } });
  console.log(`✓ Dosha model query successful. Found ${count} published active doshas in DB.`);
  assert(count >= 5, 'At least 5 published doshas should exist in DB');

  // Test 2: List Public Doshas (No Filter)
  console.log('\nTest 2: Verifying GET /api/v1/doshas (all published doshas)...');
  const reqAll = { query: {} };
  const resAll = await invokeHandler(listPublicDoshas, reqAll);

  assert.strictEqual(resAll.statusCode, 200);
  assert.strictEqual(resAll.body.success, true);
  assert.strictEqual(resAll.body.message, 'Doshas list retrieved successfully.');
  assert(resAll.body.data.total >= 5);
  assert(Array.isArray(resAll.body.data.doshas));

  // Verify lightweight projection (description, effects, cancellations, remedies should NOT be in listing)
  const first = resAll.body.data.doshas[0];
  assert(first.name, 'Item must have name');
  assert(first.slug, 'Item must have slug');
  assert(first.category, 'Item must have category');
  assert(first.severity, 'Item must have severity');
  assert(Array.isArray(first.affected_planets), 'affected_planets must be array');
  assert(first.description === undefined, 'description must be omitted in list view');
  assert(first.effects === undefined, 'effects must be omitted in list view');
  assert(first.cancellations === undefined, 'cancellations must be omitted in list view');
  assert(first.remedies === undefined, 'remedies must be omitted in list view');
  console.log(`✓ List view returns ${resAll.body.data.total} doshas with correct lightweight projection.`);

  // Test 3: List Filter by Category ('marriage')
  console.log('\nTest 3: Verifying category filter (?category=marriage)...');
  const reqCat = { query: { category: 'marriage' } };
  const resCat = await invokeHandler(listPublicDoshas, reqCat);

  assert.strictEqual(resCat.statusCode, 200);
  assert.strictEqual(resCat.body.data.total, 1);
  assert.strictEqual(resCat.body.data.doshas[0].slug, 'mangal-dosha');
  console.log('✓ Category filter successfully matched Mangal Dosha.');

  // Test 4: List Filter by Category ('karmic')
  console.log('\nTest 4: Verifying category filter (?category=karmic)...');
  const reqKarmic = { query: { category: ' Karmic ' } };
  const resKarmic = await invokeHandler(listPublicDoshas, reqKarmic);

  assert.strictEqual(resKarmic.statusCode, 200);
  assert.strictEqual(resKarmic.body.data.total, 2);
  const slugs = resKarmic.body.data.doshas.map(d => d.slug);
  assert(slugs.includes('kala-sarpa-dosha') && slugs.includes('pitru-dosha'));
  console.log('✓ Category filter matched Kala Sarpa Dosha and Pitru Dosha.');

  // Test 5: List Filter by Severity ('severe')
  console.log('\nTest 5: Verifying severity filter (?severity=severe)...');
  const reqSev = { query: { severity: 'severe' } };
  const resSev = await invokeHandler(listPublicDoshas, reqSev);

  assert.strictEqual(resSev.statusCode, 200);
  assert.strictEqual(resSev.body.data.total, 1);
  assert.strictEqual(resSev.body.data.doshas[0].slug, 'kala-sarpa-dosha');
  console.log('✓ Severity filter successfully matched Kala Sarpa Dosha.');

  // Test 6: List Filter by Search Term
  console.log('\nTest 6: Verifying search filter (?search=Ganda)...');
  const reqSearch = { query: { search: 'Ganda' } };
  const resSearch = await invokeHandler(listPublicDoshas, reqSearch);

  assert.strictEqual(resSearch.statusCode, 200);
  assert.strictEqual(resSearch.body.data.total, 1);
  assert.strictEqual(resSearch.body.data.doshas[0].slug, 'ganda-moola-dosha');
  console.log('✓ Search query successfully matched Ganda Moola Dosha.');

  // Test 7: Get Single Dosha by Slug (Full detail with remedies & cancellations)
  console.log('\nTest 7: Verifying GET /api/v1/doshas/:slug (mangal-dosha)...');
  const initialMangal = await Dosha.findOne({ where: { slug: 'mangal-dosha' } });
  const initialViews = Number(initialMangal.views_count || 0);

  const reqSingle = { params: { slug: 'MANGAL-DOSHA' } }; // test case-insensitivity
  const resSingle = await invokeHandler(getPublicDoshaBySlug, reqSingle);

  assert.strictEqual(resSingle.statusCode, 200);
  assert.strictEqual(resSingle.body.success, true);
  assert.strictEqual(resSingle.body.message, 'Dosha guide retrieved successfully.');

  const doshaData = resSingle.body.data.dosha;
  assert.strictEqual(doshaData.slug, 'mangal-dosha');
  assert.strictEqual(doshaData.name, 'Mangal Dosha');
  assert(doshaData.description && doshaData.description.length > 50, 'Must include full description');
  assert(doshaData.effects && doshaData.effects.length > 20, 'Must include effects');
  assert(doshaData.cancellations && doshaData.cancellations.length > 20, 'Must include cancellations');
  assert(Array.isArray(doshaData.remedies), 'remedies must be an array');
  assert(doshaData.remedies.length >= 4, 'Must have at least 4 structured remedies');
  assert(doshaData.remedies[0].type && doshaData.remedies[0].title, 'Remedy must have type and title');
  assert(doshaData.meta_title, 'Must have meta_title');
  assert(doshaData.canonical_url, 'Must have canonical_url');

  // Allow async view count increment to settle
  await new Promise(resolve => setTimeout(resolve, 300));
  const updatedMangal = await Dosha.findOne({ where: { slug: 'mangal-dosha' } });
  assert.strictEqual(Number(updatedMangal.views_count), initialViews + 1, 'views_count must increment by 1');
  console.log(`✓ Single Dosha guide returned full details (description, effects, cancellations, ${doshaData.remedies.length} remedies) and incremented views_count.`);

  // Test 8: 404 on Invalid Slug
  console.log('\nTest 8: Verifying 404 response on unknown slug...');
  const req404 = { params: { slug: 'non-existent-dosha' } };
  const res404 = await invokeHandler(getPublicDoshaBySlug, req404);

  assert(res404.error, 'Must pass error to next');
  assert.strictEqual(res404.statusCode, 404);
  assert.strictEqual(res404.error.message, 'The requested Dosha guide was not found or is currently unavailable.');
  console.log('✓ 404 properly handled with exact error message.');

  // Test 9: 400 on Missing Slug
  console.log('\nTest 9: Verifying 400 response on missing slug...');
  const req400 = { params: { slug: '   ' } };
  const res400 = await invokeHandler(getPublicDoshaBySlug, req400);

  assert(res400.error, 'Must pass error to next');
  assert.strictEqual(res400.statusCode, 400);
  assert.strictEqual(res400.error.message, 'Dosha slug is required.');
  console.log('✓ 400 properly handled when slug is blank.');

  console.log('\n====================================================');
  console.log('✓ ALL PUBLIC DOSHAS TESTS PASSED SUCCESSFULLY! ✓');
  console.log('====================================================\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
