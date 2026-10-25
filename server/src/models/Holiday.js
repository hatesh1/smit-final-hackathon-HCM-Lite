const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    isRecurring: { type: Boolean, default: false },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Holiday', holidaySchema);
