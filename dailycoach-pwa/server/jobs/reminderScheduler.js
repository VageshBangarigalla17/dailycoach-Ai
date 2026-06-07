const Schedule = require('../models/Schedule');
const DailyLog = require('../models/DailyLog');
const admin = require('../config/firebaseAdmin');

const sendPushNotification = async (fcmToken, type, schedule) => {
  if (!admin || !fcmToken) return;

  const payloadData = {
    type: String(type || ''),
    taskId: String(schedule._id.toString() || ''),
    taskName: String(schedule.taskName || ''),
    startTime: String(schedule.startTime || ''),
    endTime: String(schedule.endTime || '')
  };

  try {
    await admin.messaging().send({
      token: fcmToken,
      data: payloadData,
      android: {
        priority: 'high'
      },
      webpush: {
        headers: {
          Urgency: 'high'
        }
      }
    });
    console.log(`[FCM] Push notification (${type}) sent for "${schedule.taskName}" to token: ${fcmToken.substring(0, 10)}...`);
  } catch (error) {
    console.error(`[FCM] Error sending push notification:`, error.message);
  }
};

const startScheduler = (io) => {
  let lastTriggeredMinute = -1;

  // Check for reminders exactly at the 0th second of every minute
  // We use setInterval instead of node-cron to avoid noisy 'missed execution' warnings
  // when the event loop is slightly delayed by DB operations.
  setInterval(async () => {
    const now = new Date();
    
    if (now.getSeconds() === 0 && now.getMinutes() !== lastTriggeredMinute) {
      lastTriggeredMinute = now.getMinutes();
      
      try {
        // Format as HH:mm
        const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
        const currentDay = now.getDay();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Check for START times (Send Push Notification + Socket Event)
        const startSchedules = await Schedule.find({
          isActive: true,
          daysOfWeek: currentDay,
          startTime: currentTime
        }).populate('userId');

        if (startSchedules.length > 0) {
          startSchedules.forEach(schedule => {
            if (schedule.userId && schedule.userId.enableNotifications) {
              const userId = schedule.userId._id.toString();
              console.log(`[Scheduler] START Reminder for user ${schedule.userId.email}: "${schedule.taskName}" at ${schedule.startTime}`);
              
              const payloadData = {
                scheduleId: schedule._id,
                taskName: schedule.taskName,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                type: 'start'
              };
              
              // Emit instant websocket event (for Desktop/active app)
              io.to(userId).emit('reminder:start', payloadData);
              
              // Send FCM Push Notification (for Mobile/backgrounded app)
              if (schedule.userId.fcmToken) {
                sendPushNotification(schedule.userId.fcmToken, 'start', schedule);
              }
            }
          });
        }

        // 2. Check for END times (Send Push Notification + Socket Event)
        const endSchedules = await Schedule.find({
          isActive: true,
          daysOfWeek: currentDay,
          endTime: currentTime
        }).populate('userId');

        if (endSchedules.length > 0) {
          for (const schedule of endSchedules) {
            if (schedule.userId && schedule.userId.enableNotifications) {
              const userId = schedule.userId._id.toString();
              console.log(`[Scheduler] FOLLOW-UP Reminder for user ${schedule.userId.email}: "${schedule.taskName}" ended at ${schedule.endTime}`);
              
              const payloadData = {
                scheduleId: schedule._id,
                taskName: schedule.taskName,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                type: 'followup'
              };

              // Emit instant websocket event
              io.to(userId).emit('reminder:followup', payloadData);
              
              // Send FCM Push Notification
              if (schedule.userId.fcmToken) {
                sendPushNotification(schedule.userId.fcmToken, 'followup', schedule);
              }
            }
          }
        }

        // 3. Check for SECOND-CHANCE times (endTime + 10 mins)
        const parseTime = (timeStr) => {
          const [h, m] = timeStr.split(':').map(Number);
          return h * 60 + m;
        };
        
        const currentMins = parseTime(currentTime);

        const allSchedules = await Schedule.find({
          isActive: true,
          daysOfWeek: currentDay
        }).populate('userId');

        for (const schedule of allSchedules) {
          if (!schedule.endTime) continue;
          const endMins = parseTime(schedule.endTime);
          
          // If current time is any 10-minute interval past end time (e.g. +10, +20, +30)
          if (currentMins > endMins && (currentMins - endMins) % 10 === 0) {
            const existingLog = await DailyLog.findOne({
              userId: schedule.userId._id,
              scheduleId: schedule._id,
              date: todayStr
            });

            // Only trigger if they haven't responded definitively
            if (!existingLog || existingLog.status === 'active' || existingLog.status === 'no-response') {
               if (schedule.userId && schedule.userId.enableNotifications) {
                 const userId = schedule.userId._id.toString();
                 console.log(`[Scheduler] SECOND-CHANCE Reminder (Loop) for user ${schedule.userId.email}: "${schedule.taskName}" ended ${currentMins - endMins} mins ago`);
                 
                 const payloadData = {
                   scheduleId: schedule._id,
                   taskName: schedule.taskName,
                   startTime: schedule.startTime,
                   endTime: schedule.endTime,
                   type: 'second-chance'
                 };
                 
                 io.to(userId).emit('reminder:loop', payloadData);
                 
                 if (schedule.userId.fcmToken) {
                   sendPushNotification(schedule.userId.fcmToken, 'second-chance', schedule);
                 }
               }
            }
          }
        }

      } catch (error) {
        console.error('[Scheduler] Error running reminder job:', error);
      }
    }
  }, 500); // Check every half-second to guarantee we hit the 0th second exactly

  console.log('[Scheduler] Reminder job started with precise 0th-second setInterval triggers');
};

module.exports = startScheduler;
