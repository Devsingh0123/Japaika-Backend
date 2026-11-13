import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = await import('../config/db.js');
const { Review } = await import('../models/index.js');
const { ensureDefaultReviews } = await import('../services/reviewService.js');

try {
  await sequelize.authenticate();
  await Review.sync({ alter: true });
  await ensureDefaultReviews();
  const total = await Review.count();
  console.log(`Reviews table synced and seeded successfully. Total reviews: ${total}`);
  await sequelize.close();
  process.exit(0);
} catch (error) {
  console.error('Error seeding reviews:', error);
  process.exit(1);
}
