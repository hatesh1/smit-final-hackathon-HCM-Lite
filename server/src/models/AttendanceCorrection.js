const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    requestedCheckIn: { type: Date, required: true },
    requestedCheckOut: { type: Date, default: null },
    requestedStatus: {
      type: String,
      enum: ['present', 'late', 'half-day'],
      default: 'present',
    },
    reason: { type: String, required: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewComment: { type: String, default: '' },
  },
  { timestamps: true }
);

attendanceCorrectionSchema.index({ user: 1, date: -1 });
attendanceCorrectionSchema.index({ status: 1 });

module.exports = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);
