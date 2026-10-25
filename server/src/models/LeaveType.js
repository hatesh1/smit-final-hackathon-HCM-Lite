const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true }, // 'annual', 'sick', 'casual', 'unpaid'
    yearlyQuota: { type: Number, default: 0 }, // 14, 8, 10, or 0 (unlimited for unpaid)
    isPaid: { type: Boolean, default: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
