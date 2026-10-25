const User = require('../models/User');
const Profile = require('../models/Profile');
const CompanySettings = require('../models/CompanySettings');
const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');
const { logAction } = require('./audit.service');
const { initializeDefaults } = require('./settings.service');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sha256,
  randomToken,
} = require('../utils/jwt');

async function firstRunSetup({ companyName, officeStart, graceMinutes, halfDayHours, officeLocation, adminEmail, adminPassword, adminName }) {
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    throw new ApiError(400, 'System is already initialized with an Admin account');
  }

  // 1. Initialize Company Settings
  await CompanySettings.findOneAndUpdate(
    {},
    {
      companyName: companyName || 'HCM Lite Company',
      officeStart: officeStart || '09:00',
      graceMinutes: Number(graceMinutes) || 15,
      halfDayHours: Number(halfDayHours) || 5,
      weekendDays: ['Saturday', 'Sunday'],
      officeLocation: officeLocation || {
        lat: 24.8607,
        lng: 67.0011,
        radiusMeters: 150,
        address: '',
      },
      isConfigured: true,
    },
    { upsert: true, new: true }
  );

  // 2. Initialize default departments, designations, leave types, holidays
  await initializeDefaults();

  // 3. Create Admin user
  const admin = new User({
    employeeId: 'ADM001',
    email: (adminEmail || 'admin@hcmlite.com').toLowerCase(),
    role: 'admin',
    isEmailVerified: true,
    mustChangePassword: false,
    isActive: true,
  });
  await admin.setPassword(adminPassword || 'Admin@123');
  await admin.save();

  // 4. Create Admin Profile
  const [first, ...rest] = (adminName || 'System Administrator').split(' ');
  await Profile.create({
    user: admin._id,
    personal: {
      firstName: first || 'System',
      lastName: rest.join(' ') || 'Admin',
      phone: '+92 300 0000000',
      address: 'Zaitoon Ashraf IT Park, Karachi',
    },
    job: {
      designation: 'Chief Technology Officer / Administrator',
      department: 'Management',
      joiningDate: new Date(),
      status: 'active',
    },
    salary: {
      basic: 250000,
      hra: 100000,
      medical: 25000,
      allowances: 25000,
      currency: 'PKR',
    },
  });

  await logAction({
    actor: { id: admin._id, email: admin.email, role: 'admin', employeeId: admin.employeeId },
    action: 'create',
    entity: 'FirstRunSetup',
    entityId: admin._id,
    details: `First run setup completed: Company '${companyName}' configured and Admin created`,
  });

  const accessToken = signAccessToken({ id: admin._id, role: admin.role, employeeId: admin.employeeId });
  const refreshToken = signRefreshToken({ id: admin._id, role: admin.role, employeeId: admin.employeeId });

  admin.refreshTokenHashes.push(sha256(refreshToken));
  await admin.save();

  return {
    accessToken,
    refreshToken,
    user: admin.toSafeJSON(),
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash +refreshTokenHashes'
  );
  if (!user) throw new ApiError(401, 'Invalid email or password');
  if (!user.isActive) throw new ApiError(403, 'Your account has been deactivated. Contact an administrator.');

  const match = await user.comparePassword(password);
  if (!match) throw new ApiError(401, 'Invalid email or password');

  const accessToken = signAccessToken({ id: user._id, role: user.role, employeeId: user.employeeId });
  const refreshToken = signRefreshToken({ id: user._id, role: user.role, employeeId: user.employeeId });

  user.refreshTokenHashes.push(sha256(refreshToken));
  if (user.refreshTokenHashes.length > 5) {
    user.refreshTokenHashes.splice(0, user.refreshTokenHashes.length - 5);
  }
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: user.toSafeJSON(),
  };
}

async function refresh(oldToken) {
  if (!oldToken) throw new ApiError(401, 'Refresh token required');
  let decoded;
  try {
    decoded = verifyRefreshToken(oldToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = sha256(oldToken);
  const user = await User.findById(decoded.id).select('+refreshTokenHashes');
  if (!user || !user.isActive) throw new ApiError(401, 'User account not found or inactive');

  const idx = user.refreshTokenHashes.indexOf(tokenHash);
  if (idx === -1) {
    user.refreshTokenHashes = [];
    await user.save();
    throw new ApiError(401, 'Invalid refresh token');
  }

  user.refreshTokenHashes.splice(idx, 1);
  const accessToken = signAccessToken({ id: user._id, role: user.role, employeeId: user.employeeId });
  const refreshToken = signRefreshToken({ id: user._id, role: user.role, employeeId: user.employeeId });
  user.refreshTokenHashes.push(sha256(refreshToken));
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: user.toSafeJSON(),
  };
}

async function logout(userId, currentRefreshToken) {
  if (!userId) return;
  const user = await User.findById(userId).select('+refreshTokenHashes');
  if (!user) return;
  if (currentRefreshToken) {
    const hash = sha256(currentRefreshToken);
    user.refreshTokenHashes = user.refreshTokenHashes.filter((h) => h !== hash);
  } else {
    user.refreshTokenHashes = [];
  }
  await user.save();
}

async function changePassword(userId, { currentPassword, newPassword }, req) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  if (currentPassword) {
    const match = await user.comparePassword(currentPassword);
    if (!match) throw new ApiError(400, 'Current password is incorrect');
  }

  await user.setPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  await logAction({
    req,
    actor: { id: user._id, email: user.email, role: user.role, employeeId: user.employeeId },
    action: 'update',
    entity: 'UserPassword',
    entityId: user._id,
    details: 'User successfully updated password',
  });

  return { message: 'Password updated successfully' };
}

async function createHRUser({ employeeId, email, password, name, department = 'Human Resources', designation = 'HR Officer' }, req) {
  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { employeeId: employeeId.toUpperCase() }] });
  if (existing) {
    throw new ApiError(409, 'A user with this email or employee ID already exists');
  }

  const hr = new User({
    employeeId: employeeId.toUpperCase(),
    email: email.toLowerCase(),
    role: 'hr',
    isEmailVerified: true,
    mustChangePassword: true,
    isActive: true,
  });
  await hr.setPassword(password);
  await hr.save();

  const [first, ...rest] = (name || 'HR Specialist').split(' ');
  await Profile.create({
    user: hr._id,
    personal: {
      firstName: first || 'HR',
      lastName: rest.join(' ') || 'Officer',
      phone: '+92 300 1112233',
    },
    job: {
      department,
      designation,
      joiningDate: new Date(),
      status: 'active',
    },
    salary: {
      basic: 100000,
      hra: 40000,
      medical: 10000,
      allowances: 0,
      currency: 'PKR',
    },
  });

  await logAction({
    req,
    action: 'create',
    entity: 'HRLogin',
    entityId: hr._id,
    details: `Admin created HR account for ${hr.email} (${hr.employeeId})`,
    afterJSON: { email: hr.email, employeeId: hr.employeeId, role: 'hr' },
  });

  return hr.toSafeJSON();
}

async function listUsers({ role, isActive, search, page = 1, limit = 20 }) {
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true' || isActive === true;
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const profiles = await Profile.find({ user: { $in: users.map((u) => u._id) } }).lean();
  const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

  const enriched = users.map((u) => ({
    ...u,
    profile: profileMap.get(u._id.toString()) || null,
  }));

  return { users: enriched, total, page: Number(page), pages: Math.ceil(total / limit) || 1 };
}

async function resetUserPassword(targetUserId, newPassword, req) {
  const user = await User.findById(targetUserId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  await user.setPassword(newPassword);
  user.mustChangePassword = true;
  await user.save();

  await logAction({
    req,
    action: 'reset_password',
    entity: 'User',
    entityId: user._id,
    details: `Admin reset password for user ${user.employeeId} (${user.email})`,
  });

  return { message: `Password reset successfully for ${user.employeeId}. They must change password upon next login.` };
}

async function toggleUserStatus(targetUserId, req) {
  if (req.user.id === targetUserId || req.user._id?.toString() === targetUserId) {
    throw new ApiError(400, 'Admins cannot deactivate their own account');
  }

  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, 'User not found');

  const beforeState = user.isActive;
  user.isActive = !user.isActive;
  user.deactivatedAt = user.isActive ? null : new Date();
  await user.save();

  await logAction({
    req,
    action: user.isActive ? 'activate' : 'deactivate',
    entity: 'User',
    entityId: user._id,
    details: `Admin ${user.isActive ? 'activated' : 'deactivated'} user ${user.employeeId} (${user.email})`,
    beforeJSON: { isActive: beforeState },
    afterJSON: { isActive: user.isActive },
  });

  return user.toSafeJSON();
}

module.exports = {
  firstRunSetup,
  login,
  refresh,
  logout,
  changePassword,
  createHRUser,
  listUsers,
  resetUserPassword,
  toggleUserStatus,
};
