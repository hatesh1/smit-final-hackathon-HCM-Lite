const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const authService = require('../services/auth.service');

router.use(auth, rbac('admin'));

// List all user logins with status and role
router.get('/', async (req, res, next) => {
  try {
    const result = await authService.listUsers(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin creates HR login
router.post('/hr', async (req, res, next) => {
  try {
    const hr = await authService.createHRUser(req.body, req);
    res.status(201).json({ message: 'HR login created successfully', hr });
  } catch (err) {
    next(err);
  }
});

// Admin resets any user password
router.post('/:userId/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const result = await authService.resetUserPassword(req.params.userId, newPassword, req);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin deactivates / reactivates user login
router.patch('/:userId/toggle-status', async (req, res, next) => {
  try {
    const user = await authService.toggleUserStatus(req.params.userId, req);
    res.json({ message: `User status updated to ${user.isActive ? 'Active' : 'Deactivated'}`, user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
