import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Review Model (`reviews` table)
 * ------------------------------
 * Stores public customer reviews for Japaika features (Jyotish, Reports, Kundli, Compatibility, Shastra).
 */
export const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  first_name: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(40),
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(60),
    allowNull: true,
    defaultValue: 'India'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 5
    }
  },
  category: {
    type: DataTypes.ENUM('jyotish', 'reports', 'kundli', 'compatibility', 'shastra'),
    allowNull: false,
    defaultValue: 'jyotish'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { name: 'idx_reviews_user_id', fields: ['user_id'] },
    { name: 'idx_reviews_category', fields: ['category'] },
    { name: 'idx_reviews_approved_created', fields: ['is_approved', 'created_at'] }
  ]
});
