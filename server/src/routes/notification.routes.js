const router = require('express').Router();
const auth = require('../middleware/auth');
const notificationService = require('../services/notification.service');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await notificationService.listOwn(req.user.id, req.query);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const result = await notificationService.markAsRead(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
