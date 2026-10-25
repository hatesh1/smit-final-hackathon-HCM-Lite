const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const leaveService = require('../services/leave.service');

router.use(auth);

// Get Own Leave Balances
router.get('/balances', async (req, res, next) => {
  try {
    const balances = await leaveService.getBalances(req.user.id);
    res.json({ balances });
  } catch (err) {
    next(err);
  }
});

// Get Any Employee's Leave Balances (Admin & HR)
router.get('/balances/:userId', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const balances = await leaveService.getBalances(req.params.userId);
    res.json({ balances });
  } catch (err) {
    next(err);
  }
});

// Apply for leave (HR own, Employee own)
router.post('/', async (req, res, next) => {
  try {
    const request = await leaveService.create(req.user.id, req.body, req);
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
});

// Own Leave History
router.get('/me', async (req, res, next) => {
  try {
    const requests = await leaveService.listOwn(req.user.id, req.query);
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// Cancel own pending leave
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await leaveService.cancelOwn(req.user.id, req.params.id, req);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin & HR: List all leave applications
router.get('/', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const result = await leaveService.adminList(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// HR: Approve or Reject leave with comment (HR only per brief)
router.patch('/:id/decision', rbac('hr'), async (req, res, next) => {
  try {
    const request = await leaveService.decide(req.user.id, req.params.id, req.body, req);
    res.json({ request });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
