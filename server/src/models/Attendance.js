const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    status: {
      type: String,
      enum: ['present', 'late', 'half-day', 'leave', 'absent', 'missing_checkout'],
      required: true,
      default: 'present',
    },
    workHours: { type: Number, default: 0, min: 0 },
    source: { type: String, enum: ['web', 'camera', 'system', 'manual'], default: 'web' },
    faceVerified: { type: Boolean, default: false },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      distanceMeters: { type: Number },
      accuracy: { type: Number },
    },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
