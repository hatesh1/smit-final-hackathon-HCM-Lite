const Announcement = require('../models/Announcement');
const Profile = require('../models/Profile');
const { logAction } = require('./audit.service');
const { notifyAdmins } = require('./notification.service');

async function createAnnouncement({ title, content, priority = 'normal', targetRoles = ['all'], expiresAt }, authorUser, req) {
  const profile = await Profile.findOne({ user: authorUser.id || authorUser._id }).lean();
  const authorName = profile ? `${profile.personal?.firstName || ''} ${profile.personal?.lastName || ''}`.trim() : 'Management';

  const announcement = await Announcement.create({
    title,
    content,
    author: authorUser.id || authorUser._id,
    authorName,
    authorRole: authorUser.role,
    priority,
    targetRoles: Array.isArray(targetRoles) ? targetRoles : [targetRoles],
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });

  await logAction({
    req,
    action: 'create',
    entity: 'Announcement',
    entityId: announcement._id,
    details: `Posted announcement: "${title}" (Priority: ${priority})`,
  });

  return announcement.toObject();
}

async function listAnnouncements(userRole = 'employee') {
  const query = {
    isActive: true,
    $or: [{ targetRoles: 'all' }, { targetRoles: userRole }],
  };
  return Announcement.find(query).sort({ createdAt: -1 }).limit(20).lean();
}

async function deleteAnnouncement(announcementId, req) {
  const item = await Announcement.findById(announcementId);
  if (!item) return;

  item.isActive = false;
  await item.save();

  await logAction({
    req,
    action: 'delete',
    entity: 'Announcement',
    entityId: announcementId,
    details: `Archived announcement: "${item.title}"`,
  });

  return { success: true };
}

module.exports = {
  createAnnouncement,
  listAnnouncements,
  deleteAnnouncement,
};
