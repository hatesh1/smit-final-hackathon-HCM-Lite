const Profile = require('../models/Profile');
const User = require('../models/User');
const storage = require('../utils/storage');
const { ApiError } = require('../middleware/errorHandler');

// The only fields an employee may change on their own profile.
const EMPLOYEE_EDITABLE = [
  'personal.firstName',
  'personal.lastName',
  'personal.dob',
  'personal.phone',
  'personal.address',
  'personal.emergencyContact',
];

const ADMIN_EDITABLE = [
  ...EMPLOYEE_EDITABLE,
  'job.designation',
  'job.department',
  'job.joiningDate',
  'job.employmentType',
  'salary.basic',
  'salary.hra',
  'salary.allowances',
  'salary.deductions',
  'salary.currency',
];

function pickPaths(body, allowedPaths) {
  const set = {};
  for (const path of allowedPaths) {
    const [section, field] = path.split('.');
    if (body?.[section] && Object.prototype.hasOwnProperty.call(body[section], field)) {
      set[path] = body[section][field];
    }
  }
  return set;
}

async function getOrCreate(userId) {
  const profile = await Profile.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { upsert: true, returnDocument: 'after' }
  ).populate('user', 'employeeId email role');
  return profile;
}

async function updateOwn(userId, body) {
  const set = pickPaths(body, EMPLOYEE_EDITABLE);
  if (Object.keys(set).length === 0) {
    throw new ApiError(400, 'No editable fields supplied');
  }
  await getOrCreate(userId);
  return Profile.findOneAndUpdate({ user: userId }, { $set: set }, { returnDocument: 'after', runValidators: true })
    .populate('user', 'employeeId email role');
}

async function adminUpdate(userId, body) {
  const set = pickPaths(body, ADMIN_EDITABLE);
  if (Object.keys(set).length === 0) {
    throw new ApiError(400, 'No editable fields supplied');
  }
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  await getOrCreate(userId);
  return Profile.findOneAndUpdate({ user: userId }, { $set: set }, { returnDocument: 'after', runValidators: true })
    .populate('user', 'employeeId email role');
}

async function adminGet(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return getOrCreate(userId);
}

async function adminDelete(actorId, userId) {
  if (String(userId) === String(actorId)) {
    throw new ApiError(400, 'You cannot delete your own account');
  }
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const Attendance = require('../models/Attendance');
  const LeaveRequest = require('../models/LeaveRequest');
  const Notification = require('../models/Notification');

  // User goes first so login/refresh dies immediately even if a cascade step fails.
  // Uploaded files (avatar/documents) are left in storage: the storage
  // abstraction has no remove() and orphaned files are harmless.
  await User.deleteOne({ _id: user._id });
  await Promise.all([
    Profile.deleteOne({ user: user._id }),
    Attendance.deleteMany({ user: user._id }),
    LeaveRequest.deleteMany({ user: user._id }),
    Notification.deleteMany({ user: user._id }),
  ]);

  return { deleted: { id: user._id, employeeId: user.employeeId, email: user.email } };
}

async function adminList({ page = 1, limit = 10, search = '' }) {
  const userFilter = {};
  if (search) {
    userFilter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }
  const users = await User.find(userFilter)
    .sort({ employeeId: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await User.countDocuments(userFilter);

  const profiles = await Profile.find({ user: { $in: users.map((u) => u._id) } })
    .select('-documents')
    .lean();
  const byUser = new Map(profiles.map((p) => [p.user.toString(), p]));

  const rows = users.map((u) => ({
    user: { id: u._id, employeeId: u.employeeId, email: u.email, role: u.role, isEmailVerified: u.isEmailVerified },
    profile: byUser.get(u._id.toString()) || null,
  }));

  return { rows, total, page: Number(page), pages: Math.ceil(total / limit) || 1 };
}

async function setPicture(userId, file) {
  if (!file) throw new ApiError(400, 'No file uploaded');
  const { url } = await storage.save({
    buffer: file.buffer,
    originalName: file.originalname,
    mime: file.mimetype,
    folder: 'avatars',
  });
  await getOrCreate(userId);
  return Profile.findOneAndUpdate({ user: userId }, { $set: { profilePictureUrl: url } }, { returnDocument: 'after' })
    .populate('user', 'employeeId email role');
}

async function addDocument(userId, file, name) {
  if (!file) throw new ApiError(400, 'No file uploaded');
  const { url } = await storage.save({
    buffer: file.buffer,
    originalName: file.originalname,
    mime: file.mimetype,
    folder: 'documents',
  });
  await getOrCreate(userId);
  return Profile.findOneAndUpdate(
    { user: userId },
    { $push: { documents: { name: name || file.originalname, url } } },
    { returnDocument: 'after' }
  ).populate('user', 'employeeId email role');
}

module.exports = {
  EMPLOYEE_EDITABLE,
  getOrCreate,
  updateOwn,
  adminUpdate,
  adminGet,
  adminDelete,
  adminList,
  setPicture,
  addDocument,
};
