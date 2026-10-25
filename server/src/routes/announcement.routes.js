const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const announcementService = require('../services/announcement.service');

router.use(auth);

// List announcements visible to current role
router.get('/', async (req, res, next) => {
  try {
    const list = await announcementService.listAnnouncements(req.user.role);
    res.json({ announcements: list });
  } catch (err) {
    next(err);
  }
});

// Post announcement (Admin & HR)
router.post('/', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const announcement = await announcementService.createAnnouncement(req.body, req.user, req);
    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
});

// Archive / Delete announcement (Admin only)
router.delete('/:id', rbac('admin'), async (req, res, next) => {
  try {
    const result = await announcementService.deleteAnnouncement(req.params.id, req);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
