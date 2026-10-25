const AuditLog = require('../models/AuditLog');

async function logAction({ req, actor, action, entity, entityId, details, beforeJSON, afterJSON }) {
  try {
    const actorInfo = actor || {
      id: req?.user?.id || req?.user?._id,
      employeeId: req?.user?.employeeId || '',
      email: req?.user?.email || '',
      role: req?.user?.role || '',
    };

    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';

    await AuditLog.create({
      actor: actorInfo,
      action,
      entity,
      entityId: entityId ? String(entityId) : '',
      details: details || `${action} on ${entity}`,
      beforeJSON: beforeJSON || null,
      afterJSON: afterJSON || null,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('[audit] Failed to record audit log:', err.message);
  }
}

async function listAuditLogs({ page = 1, limit = 50, entity, action }) {
  const query = {};
  if (entity) query.entity = entity;
  if (action) query.action = action;

  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  return { logs, total, page: Number(page), pages: Math.ceil(total / limit) || 1 };
}

module.exports = {
  logAction,
  listAuditLogs,
};
