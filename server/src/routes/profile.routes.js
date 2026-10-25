const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { uploadImage, uploadDocument } = require('../middleware/upload');
const controller = require('../controllers/profile.controller');

router.use(auth);

// Own profile (any authenticated user; employee-editable fields only)
router.get('/me', controller.getMe);
router.patch('/me', controller.updateMe);
router.post('/me/picture', uploadImage, controller.uploadPicture);
router.post('/me/documents', uploadDocument, controller.uploadDocument);

// Directory + full edit (admin only)
router.get('/', rbac('admin'), controller.list);
router.get('/:userId', rbac('admin'), controller.getOne);
router.put('/:userId', rbac('admin'), controller.updateOne);
router.delete('/:userId', rbac('admin'), controller.deleteOne);

module.exports = router;
