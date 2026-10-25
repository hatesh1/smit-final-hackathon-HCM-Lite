const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const auditService = require('../services/audit.service');

router.use(auth, rbac('admin'));

// Admin only: view immutable audit log trail
router.get('/', async (req, res, next) => {
  try {
    const result = await auditService.listAuditLogs(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
