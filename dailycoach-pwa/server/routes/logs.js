const express = require('express');
const router = express.Router();
const { 
  logTaskCompletion, 
  getTodayLogs, 
  getWeekLogs, 
  getTaskHistory 
} = require('../controllers/logController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', logTaskCompletion);
router.get('/today', getTodayLogs);
router.get('/week', getWeekLogs);
router.get('/history/:scheduleId', getTaskHistory);

module.exports = router;
