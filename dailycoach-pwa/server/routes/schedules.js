const express = require('express');
const router = express.Router();
const { 
  createSchedule, 
  getSchedules, 
  getScheduleById, 
  updateSchedule, 
  deleteSchedule 
} = require('../controllers/scheduleController');
const { protect } = require('../middleware/auth');

router.use(protect); // All schedule routes require authentication

router.post('/', createSchedule);
router.get('/', getSchedules);
router.get('/:id', getScheduleById);
router.patch('/:id', updateSchedule);
router.delete('/:id', deleteSchedule);

module.exports = router;
