const DailyLog = require('../models/DailyLog');
const UserStats = require('../models/UserStats');
const Schedule = require('../models/Schedule');

const computeStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Get logs for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const logs = await DailyLog.find({
      userId,
      date: { $gte: thirtyDaysAgoStr }
    }).populate('scheduleId', 'taskName');

    // 2. Compute streaks
    // Sort logs by date ascending
    const logsByDate = {};
    logs.forEach(log => {
      if (!logsByDate[log.date]) logsByDate[log.date] = [];
      logsByDate[log.date].push(log);
    });

    const uniqueDates = Object.keys(logsByDate).sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    
    // Simple streak calculation: consecutive days with at least 1 'done' or 'late' task
    // Real strict streak would be 100% completion, but let's just go with "active days" 
    // or we can calculate 100% completion days.
    const completedDays = uniqueDates.filter(date => {
      const dayLogs = logsByDate[date];
      // A day is "completed" if they did at least one task
      return dayLogs.some(l => l.status === 'done' || l.status === 'late');
    });

    // Check streak backwards from today
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (completedDays.includes(todayStr) || completedDays.includes(yesterdayStr)) {
      currentStreak = 1;
      let checkDate = new Date(completedDays.includes(todayStr) ? todayStr : yesterdayStr);
      
      while(true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const prevDateStr = checkDate.toISOString().split('T')[0];
        if (completedDays.includes(prevDateStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // This is just a simple way. If we want full accuracy, we'd need historical processing.
    // Let's just update the current stats
    
    // 3. Compute best/worst tasks
    const taskStats = {};
    logs.forEach(log => {
      const taskName = log.scheduleId ? log.scheduleId.taskName : 'Unknown';
      if (!taskStats[taskName]) {
        taskStats[taskName] = { total: 0, completed: 0 };
      }
      taskStats[taskName].total += 1;
      if (log.status === 'done' || log.status === 'late') {
        taskStats[taskName].completed += 1;
      }
    });

    let bestTask = 'None';
    let worstTask = 'None';
    let highestRate = -1;
    let lowestRate = 101;

    Object.keys(taskStats).forEach(task => {
      const stats = taskStats[task];
      const rate = (stats.completed / stats.total) * 100;
      
      if (rate > highestRate && stats.total >= 3) { // Require at least 3 attempts to be "best"
        highestRate = rate;
        bestTask = task;
      }
      if (rate < lowestRate && stats.total >= 3) {
        lowestRate = rate;
        worstTask = task;
      }
    });

    // 4. Compute this week's completion percentage
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const weekLogs = logs.filter(l => l.date >= sevenDaysAgoStr);
    const weekTotal = weekLogs.length;
    const weekCompleted = weekLogs.filter(l => l.status === 'done' || l.status === 'late').length;
    const completionPercentageThisWeek = weekTotal === 0 ? 0 : Math.round((weekCompleted / weekTotal) * 100);

    // Total tasks completed ever (we can just add to the existing UserStats instead of recalculating from 30 days)
    let userStats = await UserStats.findOne({ userId });
    if (!userStats) {
      userStats = new UserStats({ userId });
    }

    userStats.currentStreakDays = currentStreak;
    if (currentStreak > userStats.longestStreakDays) {
      userStats.longestStreakDays = currentStreak;
    }
    userStats.completionPercentageThisWeek = completionPercentageThisWeek;
    userStats.bestPerformedTask = bestTask !== 'None' ? bestTask : userStats.bestPerformedTask;
    userStats.mostMissedTask = worstTask !== 'None' ? worstTask : userStats.mostMissedTask;
    
    // totalTasksCompleted is incremented in logController, but we can double check here.
    
    await userStats.save();

    res.json({
      success: true,
      stats: userStats.toJSON()
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  computeStats
};
