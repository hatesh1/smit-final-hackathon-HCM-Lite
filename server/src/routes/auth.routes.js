const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const authService = require('../services/auth.service');
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', auth, authController.logout);

router.post('/change-password', auth, async (req, res, next) => {
  try {
    const result = await authService.changePassword(req.user.id, req.body, req);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).lean();
    res.json({
      user: {
        id: req.user.id,
        employeeId: req.user.employeeId,
        email: req.user.email,
        role: req.user.role,
        mustChangePassword: req.user.mustChangePassword,
        isActive: req.user.isActive,
      },
      profile,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
