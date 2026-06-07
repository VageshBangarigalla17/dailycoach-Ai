const DailyLog = require('../models/DailyLog');
const UserStats = require('../models/UserStats');

const logTaskCompletion = async (req, res, next) => {
  try {
    const { scheduleId, date, status, voiceResponse, completedAt, notes, reminderType } = req.body;

    if (!scheduleId || !date || !status) {
      return res.status(400).json({ success: false, message: 'Missing required fields: scheduleId, date, status' });
    }

    // Upsert the log for this user/schedule/date combination
    const log = await DailyLog.findOneAndUpdate(
      { userId: req.user._id, scheduleId, date },
      { 
        status, 
        voiceResponse: voiceResponse || 'no-response', 
        completedAt: completedAt || (status === 'missed' ? null : new Date()),
        notes,
        reminderType: reminderType || 'start',
        scheduledTime: req.body.scheduledTime || '00:00'
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      log: log.toJSON()
    });
    
    // Asynchronously update UserStats total tasks
    if (status === 'done' || status === 'late') {
      UserStats.findOneAndUpdate(
        { userId: req.user._id },
        { $inc: { totalTasksCompleted: 1 } },
        { upsert: true, returnDocument: 'after' }
      ).catch(err => console.error("Error updating user stats totalTasksCompleted:", err));
    }
    
  } catch (error) {
    next(error);
  }
};

const getTodayLogs = async (req, res, next) => {
  try {
    // Determine today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    const logs = await DailyLog.find({ userId: req.user._id, date: today })
                               .populate('scheduleId', 'taskName');
    
    // Format response specifically as requested
    const formattedLogs = logs.map(log => ({
      scheduleId: log.scheduleId ? log.scheduleId._id : null,
      taskName: log.scheduleId ? log.scheduleId.taskName : 'Unknown',
      status: log.status,
      completedAt: log.completedAt ? log.completedAt.toISOString().substring(11,16) : null
    }));

    res.json({
      success: true,
      logs: formattedLogs
    });
  } catch (error) {
    next(error);
  }
};

const getWeekLogs = async (req, res, next) => {
  try {
    const { startDate } = req.query; // YYYY-MM-DD
    if (!startDate) {
      return res.status(400).json({ success: false, message: 'startDate query param is required' });
    }

    // Find logs from startDate onwards
    const logs = await DailyLog.find({ 
      userId: req.user._id,
      date: { $gte: startDate }
    });

    res.json({
      success: true,
      logs: logs.map(l => l.toJSON())
    });
  } catch (error) {
    next(error);
  }
};

const getTaskHistory = async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    
    const logs = await DailyLog.find({ userId: req.user._id, scheduleId })
                               .sort({ date: -1 })
                               .limit(30);

    res.json({
      success: true,
      logs: logs.map(l => l.toJSON())
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logTaskCompletion,
  getTodayLogs,
  getWeekLogs,
  getTaskHistory
};
