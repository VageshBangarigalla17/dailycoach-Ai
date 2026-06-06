const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getStats } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.get('/stats', getStats);

module.exports = router;
