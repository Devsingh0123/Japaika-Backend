import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/db.js';
import { Coupon } from '../models/Coupon.js';

export const INITIAL_COUPONS = [
  {
    code: 'QUICKGOLD',
    description: 'Flat ₹67 OFF on Gold Pack',
    discount_type: 'flat',
    discount_value: 67.00,
    applicable_products: ['pack_gold_12'],
    is_active: true,
    is_hidden: false,
    is_special_offer: true
  },
  {
    code: 'GOLDNOW',
    description: 'Flat ₹1600 OFF on Gold 12-Question Pack',
    discount_type: 'flat',
    discount_value: 1600.00,
    applicable_products: ['pack_gold_12'],
    is_active: true,
    is_hidden: false,
    is_special_offer: true
  },
  {
    code: 'ASKMAX',
    description: 'Flat ₹700 OFF on Silver Question Pack',
    discount_type: 'flat',
    discount_value: 700.00,
    applicable_products: ['pack_silver_7', 'pack_diamond_20'],
    is_active: true,
    is_hidden: false,
    is_special_offer: false
  },
  {
    code: 'VAULT',
    description: 'Flat ₹1000 OFF on Report Packs',
    discount_type: 'flat',
    discount_value: 1000.00,
    applicable_products: ['report_silver_1', 'report_gold_2', 'report_diamond_4'],
    is_active: true,
    is_hidden: false,
    is_special_offer: false
  }
];

export async function seedCoupons() {
  try {
    await sequelize.authenticate();
    console.log('Connected to MySQL database.');

    // Ensure coupons table is ready
    await Coupon.sync();

    console.log('Seeding initial promotional coupons...');
    for (const coupon of INITIAL_COUPONS) {
      const existing = await Coupon.findOne({ where: { code: coupon.code } });
      if (!existing) {
        await Coupon.create({
          id: uuidv4(),
          ...coupon
        });
        console.log(`Created coupon: ${coupon.code}`);
      } else {
        await existing.update({
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          applicable_products: coupon.applicable_products,
          is_active: coupon.is_active,
          is_hidden: coupon.is_hidden ?? false
        });
        console.log(`Updated coupon: ${coupon.code}`);
      }
    }

    console.log('Coupons seeded successfully.');
  } catch (err) {
    console.error('Error seeding coupons:', err);
    throw err;
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('seedCoupons.js')) {
  seedCoupons()
    .then(async () => {
      await sequelize.close();
      process.exit(0);
    })
    .catch(async () => {
      await sequelize.close();
      process.exit(1);
    });
}
