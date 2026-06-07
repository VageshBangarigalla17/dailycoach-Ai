const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, saveFcmToken } = require('../controllers/userController');
const { computeStats } = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.get('/stats', computeStats);
router.post('/fcm-token', saveFcmToken);

module.exports = router;
