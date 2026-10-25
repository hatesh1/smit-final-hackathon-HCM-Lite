const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'hr', 'employee'], default: 'employee' },
    isEmailVerified: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date, default: null },
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },
    refreshTokenHashes: { type: [String], default: [], select: false },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    employeeId: this.employeeId,
    email: this.email,
    role: this.role,
    isEmailVerified: this.isEmailVerified,
    mustChangePassword: this.mustChangePassword,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
