const cron = require('node-cron');
const Schedule = require('../models/Schedule');

const startScheduler = () => {
  // Check for reminders every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Format as HH:mm
      const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
      const currentDay = now.getDay();

      const dueSchedules = await Schedule.find({
        isActive: true,
        daysOfWeek: currentDay,
        startTime: currentTime
      }).populate('userId');

      if (dueSchedules.length > 0) {
        dueSchedules.forEach(schedule => {
          // In a real production app, we would send a push notification here via FCM
          // using the user's fcmToken. For now, we log it.
          if (schedule.userId && schedule.userId.enableNotifications) {
            console.log(`[Scheduler] Reminder due for user ${schedule.userId.email}: Task "${schedule.taskName}" at ${schedule.startTime}`);
          }
        });
      }
    } catch (error) {
      console.error('[Scheduler] Error running reminder job:', error);
    }
  });

  console.log('[Scheduler] Reminder job started');
};

module.exports = startScheduler;
