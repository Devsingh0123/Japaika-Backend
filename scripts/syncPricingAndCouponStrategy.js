import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = await import('../config/db.js');

export async function syncPricingAndCouponStrategy() {
  console.log('--- [User Backend] Syncing Pricing & Coupon Strategy ---');

  // 1. Ensure coupons table has discount_type ENUM('percentage', 'flat')
  try {
    console.log('Checking coupons.discount_type column...');
    await sequelize.query(
      "ALTER TABLE coupons MODIFY COLUMN discount_type ENUM('percentage', 'flat') NOT NULL DEFAULT 'percentage'"
    );
    console.log('✓ coupons.discount_type is ENUM("percentage", "flat")');
  } catch (err) {
    console.warn('coupons.discount_type update notice:', err.message);
  }

  // 2. Ensure is_hidden column exists in coupons
  const [hiddenCol] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coupons' AND COLUMN_NAME = 'is_hidden'
  `);
  if (hiddenCol.length === 0) {
    console.log('Adding is_hidden column to coupons...');
    await sequelize.query('ALTER TABLE coupons ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0');
    try {
      await sequelize.query('CREATE INDEX idx_coupons_is_hidden ON coupons(is_hidden)');
    } catch {}
    console.log('✓ Added is_hidden column and index to coupons');
  } else {
    console.log('✓ coupons.is_hidden column already exists');
  }

  // 3. Ensure is_special_offer column exists in coupons
  const [specialCol] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coupons' AND COLUMN_NAME = 'is_special_offer'
  `);
  if (specialCol.length === 0) {
    console.log('Adding is_special_offer column to coupons...');
    await sequelize.query('ALTER TABLE coupons ADD COLUMN is_special_offer TINYINT(1) NOT NULL DEFAULT 0');
    try {
      await sequelize.query('CREATE INDEX idx_coupons_is_special_offer ON coupons(is_special_offer)');
    } catch {}
    console.log('✓ Added is_special_offer column and index to coupons');
  } else {
    console.log('✓ coupons.is_special_offer column already exists');
  }

  // 4. Ensure default_coupon_id column exists in question_packs
  const [defaultCouponCol] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question_packs' AND COLUMN_NAME = 'default_coupon_id'
  `);
  if (defaultCouponCol.length === 0) {
    console.log('Adding default_coupon_id column to question_packs...');
    await sequelize.query('ALTER TABLE question_packs ADD COLUMN default_coupon_id CHAR(36) NULL AFTER prices');
    try {
      await sequelize.query(`
        ALTER TABLE question_packs
        ADD CONSTRAINT fk_question_packs_default_coupon
        FOREIGN KEY (default_coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
      `);
      console.log('✓ Added foreign key fk_question_packs_default_coupon');
    } catch (fkErr) {
      console.warn('FK creation warning:', fkErr.message);
    }
    try {
      await sequelize.query('CREATE INDEX idx_question_packs_default_coupon ON question_packs(default_coupon_id)');
      console.log('✓ Added index idx_question_packs_default_coupon');
    } catch (idxErr) {
      console.warn('Index creation warning:', idxErr.message);
    }
  } else {
    console.log('✓ question_packs.default_coupon_id column already exists');
  }

  // 5. Link default coupons and tag special offer
  const [coupons] = await sequelize.query('SELECT id, code FROM coupons');
  const couponMap = new Map(coupons.map(c => [c.code, c.id]));

  if (couponMap.has('GOLDNOW')) {
    const goldCouponId = couponMap.get('GOLDNOW');
    await sequelize.query(
      'UPDATE question_packs SET default_coupon_id = ? WHERE code = "pack_gold_12"',
      { replacements: [goldCouponId] }
    );
    await sequelize.query(
      'UPDATE coupons SET is_special_offer = 1 WHERE code = "GOLDNOW"'
    );
    console.log('✓ Linked GOLDNOW to pack_gold_12 and marked as is_special_offer=1');
  }

  if (couponMap.has('ASKMAX')) {
    const silverCouponId = couponMap.get('ASKMAX');
    await sequelize.query(
      'UPDATE question_packs SET default_coupon_id = ? WHERE code = "pack_silver_7"',
      { replacements: [silverCouponId] }
    );
    console.log('✓ Linked ASKMAX to pack_silver_7');
  }

  // 6. Verification
  const [updatedPacks] = await sequelize.query(`
    SELECT qp.code, qp.name, qp.prices, qp.default_coupon_id, c.code AS default_coupon_code
    FROM question_packs qp
    LEFT JOIN coupons c ON qp.default_coupon_id = c.id
  `);
  console.log('Updated question_packs state:', updatedPacks);

  const [specialOffers] = await sequelize.query(`
    SELECT code, discount_type, discount_value, is_active, is_special_offer, is_hidden
    FROM coupons
  `);
  console.log('Updated coupons state:', specialOffers);

  console.log('--- [User Backend] Sync Completed Successfully ---');
}

// Run standalone if invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncPricingAndCouponStrategy()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}
