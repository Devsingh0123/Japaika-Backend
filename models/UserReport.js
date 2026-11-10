import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const parseJsonColumn = (raw, fallback = null) => {
  if (raw === undefined || raw === null) {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  return raw;
};

export const UserReport = sequelize.define('UserReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  chart_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'birth_charts',
      key: 'id'
    }
  },
  report_slug: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  report_type: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'career'
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  subtitle: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Generation lifecycle: pending -> generating -> completed | failed
  status: {
    type: DataTypes.ENUM('pending', 'generating', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  // Progress tracker (0-100) and current active stage for live client polling
  progress_percent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  current_stage: {
    type: DataTypes.STRING(150),
    allowNull: true,
    defaultValue: 'Initializing astrological synthesis...'
  },
  // Executive overview & key takeaways
  summary: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      return parseJsonColumn(this.getDataValue('summary'), null);
    }
  },
  // Structured list of chapters / table of contents
  table_of_contents: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      return parseJsonColumn(this.getDataValue('table_of_contents'), []);
    }
  },
  // Array of full 8-10 long-form chapters
  sections: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      return parseJsonColumn(this.getDataValue('sections'), []);
    }
  },
  // Snapshot of astrological data used (D-1, D-9/D-10, Dashas, Yogas, Karakas)
  astrological_factors: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      return parseJsonColumn(this.getDataValue('astrological_factors'), null);
    }
  },
  pdf_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  generation_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  error_message: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'user_reports',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { name: 'idx_user_reports_user_id', fields: ['user_id'] },
    { name: 'idx_user_reports_chart_id', fields: ['chart_id'] },
    { name: 'idx_user_reports_slug', fields: ['report_slug'] },
    { name: 'idx_user_reports_status', fields: ['status'] },
    // Ensures a user only ever unlocks a specific report once per birth chart
    {
      name: 'idx_user_report_unique',
      unique: true,
      fields: ['user_id', 'chart_id', 'report_slug']
    }
  ]
});
