const Notification = require('../models/Notification');
const User = require('../models/User');

async function notify({ userId, message, type = 'system', link = '' }) {
  if (!userId) return null;
  return Notification.create({
    user: userId,
    message,
    type,
    link,
  });
}

async function notifyAdmins({ message, type = 'system', link = '' }) {
  const managers = await User.find({ role: { $in: ['admin', 'hr'] } }).select('_id');
  const docs = managers.map((u) => ({
    user: u._id,
    message,
    type,
    link,
  }));
  if (docs.length > 0) {
    await Notification.insertMany(docs);
  }
}

async function listOwn(userId, { unreadOnly = false, limit = 20 } = {}) {
  const query = { user: userId };
  if (unreadOnly) query.isRead = false;
  return Notification.find(query).sort({ createdAt: -1 }).limit(Number(limit)).lean();
}

async function markAsRead(userId, notificationId) {
  if (notificationId === 'all') {
    await Notification.updateMany({ user: userId, isRead: false }, { $set: { isRead: true } });
    return { success: true };
  }
  await Notification.updateOne({ _id: notificationId, user: userId }, { $set: { isRead: true } });
  return { success: true };
}

module.exports = {
  notify,
  notifyAdmins,
  listOwn,
  markAsRead,
};
