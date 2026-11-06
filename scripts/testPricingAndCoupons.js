import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { QuestionPack, Coupon } = await import('../models/index.js');
const { calculateOrderPricing } = await import('../services/billingService.js');
const { resolveZeroCreditOffer } = await import('../controllers/chatController.js');

async function runTests() {
  console.log('====================================================');
  console.log('--- Running Pricing & Coupon Strategy Unit Tests ---');
  console.log('====================================================\n');

  // Test 1: Verify QuestionPack & Coupon Associations
  console.log('Test 1: Verifying Model Associations...');
  const goldPack = await QuestionPack.findOne({
    where: { code: 'pack_gold_12' },
    include: [{ model: Coupon, as: 'default_coupon' }]
  });
  assert(goldPack, 'pack_gold_12 must exist');
  assert(goldPack.default_coupon, 'pack_gold_12 must have default_coupon linked');
  assert.strictEqual(goldPack.default_coupon.code, 'GOLDNOW');
  console.log('✓ Model association QuestionPack -> default_coupon is working. Linked coupon:', goldPack.default_coupon.code);

  // Test 2: Calculate Pricing with Explicit Default Coupon (GOLDNOW on pack_gold_12)
  console.log('\nTest 2: Verifying calculateOrderPricing with explicit GOLDNOW...');
  const pricingWithGold = await calculateOrderPricing({
    packId: 'pack_gold_12',
    currency: 'INR',
    couponCode: 'GOLDNOW',
    billingState: 'Delhi'
  });
  console.log('Pricing result (INR):', {
    subtotal: pricingWithGold.subtotal,
    discountAmount: pricingWithGold.discountAmount,
    couponCode: pricingWithGold.couponCode,
    totalAmount: pricingWithGold.totalAmount,
    amountSubunits: pricingWithGold.amountSubunits,
    cgst: pricingWithGold.cgst,
    sgst: pricingWithGold.sgst
  });
  assert.strictEqual(pricingWithGold.subtotal, 2399);
  assert.strictEqual(pricingWithGold.discountAmount, 1600);
  assert.strictEqual(pricingWithGold.totalAmount, 799);
  assert.strictEqual(pricingWithGold.amountSubunits, 79900);
  console.log('✓ Explicit GOLDNOW pricing matched exact spec: ₹2399 - ₹1600 = ₹799.');

  // Test 3: Calculate Pricing without Coupon (Auto-apply default_coupon)
  console.log('\nTest 3: Verifying calculateOrderPricing auto-apply default_coupon...');
  const pricingAuto = await calculateOrderPricing({
    packId: 'pack_gold_12',
    currency: 'INR',
    billingState: 'Delhi'
  });
  assert.strictEqual(pricingAuto.subtotal, 2399);
  assert.strictEqual(pricingAuto.discountAmount, 1600);
  assert.strictEqual(pricingAuto.totalAmount, 799);
  assert.strictEqual(pricingAuto.couponCode, 'GOLDNOW');
  console.log('✓ Auto-apply default coupon succeeded. Coupon code applied:', pricingAuto.couponCode);

  // Test 4: Calculate Pricing in USD with Proportional Flat Discount
  console.log('\nTest 4: Verifying calculateOrderPricing in USD...');
  const pricingUsd = await calculateOrderPricing({
    packId: 'pack_gold_12',
    currency: 'USD',
    billingState: 'International'
  });
  console.log('Pricing result (USD):', {
    subtotal: pricingUsd.subtotal,
    discountAmount: pricingUsd.discountAmount,
    totalAmount: pricingUsd.totalAmount,
    amountSubunits: pricingUsd.amountSubunits
  });
  assert.strictEqual(pricingUsd.subtotal, 29.99);
  assert(pricingUsd.totalAmount < pricingUsd.subtotal, 'totalAmount must be discounted');
  console.log(`✓ USD pricing computed cleanly: $${pricingUsd.subtotal} -> $${pricingUsd.totalAmount}`);

  // Test 5: Secret / Hidden Coupon Support
  console.log('\nTest 5: Verifying Secret / Hidden Coupon validation...');
  const secretCode = `SECRET_VIP_${Date.now()}`;
  const secretCoupon = await Coupon.create({
    code: secretCode,
    description: 'Secret Influencer 20% discount',
    discount_type: 'percentage',
    discount_value: 20.00,
    applicable_products: ['pack_diamond_20'],
    is_active: true,
    is_hidden: true,
    is_special_offer: false
  });

  try {
    const pricingSecret = await calculateOrderPricing({
      packId: 'pack_diamond_20',
      currency: 'INR',
      couponCode: secretCode,
      billingState: 'Delhi'
    });
    console.log('Secret coupon pricing result:', {
      subtotal: pricingSecret.subtotal,
      discountAmount: pricingSecret.discountAmount,
      totalAmount: pricingSecret.totalAmount,
      couponCode: pricingSecret.couponCode
    });
    assert.strictEqual(pricingSecret.subtotal, 3999);
    assert.strictEqual(pricingSecret.discountAmount, 799.8);
    assert.strictEqual(pricingSecret.totalAmount, 3199.2);
    console.log('✓ Secret coupon successfully applied and validated!');
  } finally {
    await secretCoupon.destroy({ force: true });
    console.log('Cleaned up temporary secret coupon.');
  }

  // Test 6: Dynamic Zero-Credit Chat Offer Resolver
  console.log('\nTest 6: Verifying dynamic zero-credit chat offer resolver...');
  const offerInr = await resolveZeroCreditOffer('INR');
  console.log('Zero-credit offer (INR):', offerInr);
  assert(offerInr, 'Offer must not be null');
  assert(offerInr.promoCode, 'Offer must have promoCode');
  assert(offerInr.discountPercent > 0, 'Discount percent must be greater than 0');
  assert(offerInr.discountedPrice.startsWith('₹'), 'INR offer must have ₹ symbol');

  const offerUsd = await resolveZeroCreditOffer('USD');
  console.log('Zero-credit offer (USD):', offerUsd);
  assert(offerUsd.discountedPrice.startsWith('$'), 'USD offer must have $ symbol');
  console.log('✓ Dynamic zero-credit chat offer resolved successfully for both currencies.');

  console.log('\n====================================================');
  console.log('✓ ALL PRICING & COUPON TESTS PASSED SUCCESSFULLY! ✓');
  console.log('====================================================\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
