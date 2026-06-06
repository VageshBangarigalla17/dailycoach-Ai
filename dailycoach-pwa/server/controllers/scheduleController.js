const Schedule = require('../models/Schedule');

const createSchedule = async (req, res, next) => {
  try {
    const { taskName, description, startTime, endTime, daysOfWeek, color } = req.body;

    if (!taskName || !startTime || !endTime || !daysOfWeek) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const schedule = await Schedule.create({
      userId: req.user._id,
      taskName,
      description,
      startTime,
      endTime,
      daysOfWeek,
      color
    });

    res.status(201).json({
      success: true,
      schedule: schedule.toJSON()
    });
  } catch (error) {
    if (error.code === 11000) {
       return res.status(400).json({ success: false, message: 'Task with this name already exists' });
    }
    next(error);
  }
};

const getSchedules = async (req, res, next) => {
  try {
    const { today } = req.query;
    let query = { userId: req.user._id, isActive: true };

    if (today === 'true') {
      const currentDayOfWeek = new Date().getDay(); // 0-6
      query.daysOfWeek = currentDayOfWeek;
    }

    const schedules = await Schedule.find(query);
    
    res.json({
      success: true,
      schedules: schedules.map(s => s.toJSON())
    });
  } catch (error) {
    next(error);
  }
};

const getScheduleById = async (req, res, next) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    
    res.json({
      success: true,
      schedule: schedule.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({
      success: true,
      schedule: schedule.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({
      success: true,
      message: 'Schedule deleted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule
};
