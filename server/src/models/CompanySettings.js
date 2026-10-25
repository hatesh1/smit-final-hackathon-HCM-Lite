const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'HCM Lite Company' },
    officeStart: { type: String, default: '09:00' }, // 09:00
    graceMinutes: { type: Number, default: 15 },    // 15 min -> 09:15
    halfDayHours: { type: Number, default: 5 },     // under 5h = half_day
    weekendDays: { type: [String], default: ['Saturday', 'Sunday'] },
    officeLocation: {
      lat: { type: Number, default: 24.8607 },
      lng: { type: Number, default: 67.0011 },
      radiusMeters: { type: Number, default: 150 },
      address: { type: String, default: '' },
    },
    currency: { type: String, default: 'PKR' },
    isConfigured: { type: Boolean, default: false },
    fiscalYearStartMonth: { type: Number, default: 1 }, // January
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
