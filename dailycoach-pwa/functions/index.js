const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Helper to get IST date string
const getISTDateString = (dateObj = new Date()) => {
  const istDate = new Date(dateObj.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get IST time (HH:mm)
const getISTTimeFormatted = (dateObj = new Date()) => {
  const istDate = new Date(dateObj.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};



// Helper to get current day name
const getCurrentDayName = () => {
  const istDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[istDate.getDay()];
};

exports.checkReminders = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      console.log("Running checkReminders...");
      const currentTime = getISTTimeFormatted();
      const currentDay = getCurrentDayName();
      const todayDateStr = getISTDateString();
      
      const usersSnapshot = await db.collection("users").get();
      
      const notificationPromises = [];

      usersSnapshot.forEach((userDoc) => {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;

        if (!fcmToken) return;

        const processUserSchedules = async () => {
          try {
            const schedulesSnapshot = await db.collection(`users/${userId}/schedules`)
              .where("isActive", "==", true)
              .get();

            for (const scheduleDoc of schedulesSnapshot.docs) {
              const scheduleData = scheduleDoc.data();
              const scheduleId = scheduleDoc.id;

              // Check if task happens today
              if (!scheduleData.days || !scheduleData.days.includes(currentDay)) {
                continue;
              }

              // 1. Check for immediate reminder
              if (scheduleData.startTime === currentTime) {
                const logRef = db.doc(`users/${userId}/dailyLogs/${todayDateStr}_${scheduleId}`);
                const logDoc = await logRef.get();

                if (!logDoc.exists) {
                  const payload = {
                    notification: {
                      title: "DailyCoach Reminder",
                      body: `Time for: ${scheduleData.taskName || "Task"}`,
                    },
                    data: {
                      taskId: String(scheduleId || ""),
                      taskName: String(scheduleData.taskName || ""),
                      startTime: String(scheduleData.startTime || ""),
                      endTime: String(scheduleData.endTime || ""),
                      type: "reminder"
                    },
                    token: fcmToken
                  };
                  console.log(`Sending reminder to ${userId} for task ${scheduleData.taskName}`);
                  await admin.messaging().send(payload);
                }
              }

              // 2. Check for END-TIME follow-up — fires when the task window closes
              if (scheduleData.endTime === currentTime) {
                const logRef = db.doc(`users/${userId}/dailyLogs/${todayDateStr}_${scheduleId}`);
                const logDoc = await logRef.get();

                if (!logDoc.exists) {
                  const payload = {
                    notification: {
                      title: "DailyCoach Follow-up",
                      body: `Your ${scheduleData.taskName || "Task"} time just ended. Did you complete it?`,
                    },
                    data: {
                      taskId: String(scheduleId || ""),
                      taskName: String(scheduleData.taskName || ""),
                      startTime: String(scheduleData.startTime || ""),
                      endTime: String(scheduleData.endTime || ""),
                      type: "followup"
                    },
                    token: fcmToken
                  };
                  console.log(`Sending end-time follow-up to ${userId} for task ${scheduleData.taskName} (endTime: ${scheduleData.endTime})`);
                  await admin.messaging().send(payload);
                }
              }

              // 3. Check for SECOND-CHANCE follow-up (Loop every 10 mins)
              const parseTime = (timeStr) => {
                if (!timeStr) return 0;
                const [h, m] = timeStr.split(':').map(Number);
                return h * 60 + m;
              };
              
              const currentMins = parseTime(currentTime);
              const endMins = parseTime(scheduleData.endTime);

              if (currentMins > endMins && (currentMins - endMins) % 10 === 0) {
                const logRef = db.doc(`users/${userId}/dailyLogs/${todayDateStr}_${scheduleId}`);
                const logDoc = await logRef.get();
                
                // If no log exists, or it's 'active' or 'no-response', fire the second chance
                if (!logDoc.exists || logDoc.data().status === 'active' || logDoc.data().status === 'no-response') {
                  const payload = {
                    notification: {
                      title: "DailyCoach Final Check-in",
                      body: `Checking in on ${scheduleData.taskName || "Task"}. Have you completed it yet?`,
                    },
                    data: {
                      taskId: String(scheduleId || ""),
                      taskName: String(scheduleData.taskName || ""),
                      startTime: String(scheduleData.startTime || ""),
                      endTime: String(scheduleData.endTime || ""),
                      type: "second-chance"
                    },
                    token: fcmToken
                  };
                  console.log(`Sending second-chance follow-up to ${userId} for task ${scheduleData.taskName}`);
                  await admin.messaging().send(payload);
                }
              }
            }
          } catch (err) {
            console.error(`Error processing schedules for user ${userId}:`, err);
          }
        };

        notificationPromises.push(processUserSchedules());
      });

      await Promise.all(notificationPromises);
      console.log("checkReminders finished successfully.");
      return null;
    } catch (error) {
      console.error("Error in checkReminders:", error);
      return null;
    }
  });

exports.dailySummary = functions.pubsub
  .schedule('0 22 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      console.log("Running dailySummary...");
      const todayDateStr = getISTDateString();
      const usersSnapshot = await db.collection("users").get();
      
      const summaryPromises = [];

      usersSnapshot.forEach((userDoc) => {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;

        if (!fcmToken) return;

        const processUserSummary = async () => {
          try {
            const logsSnapshot = await db.collection(`users/${userId}/dailyLogs`)
              .where("dateString", "==", todayDateStr)
              .get();

            let completed = 0;
            let late = 0;
            let missed = 0;

            logsSnapshot.forEach((logDoc) => {
              const status = logDoc.data().status;
              if (status === 'done') completed++;
              else if (status === 'late') late++;
              else if (status === 'missed') missed++;
            });

            const total = completed + late + missed;
            if (total === 0) return; // No tasks logged today

            const payload = {
              notification: {
                title: "DailyCoach Summary",
                body: `Today: ${completed} done, ${late} late, ${missed} missed out of ${total} tasks.`,
              },
              data: { type: "summary" },
              token: fcmToken
            };

            console.log(`Sending summary to ${userId}`);
            await admin.messaging().send(payload);
          } catch (err) {
            console.error(`Error processing summary for user ${userId}:`, err);
          }
        };

        summaryPromises.push(processUserSummary());
      });

      await Promise.all(summaryPromises);
      console.log("dailySummary finished successfully.");
      return null;
    } catch (error) {
      console.error("Error in dailySummary:", error);
      return null;
    }
  });

exports.cleanOldLogs = functions.pubsub
  .schedule('0 3 * * 0') // every Sunday at 3 AM
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      console.log("Running cleanOldLogs...");
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      const cutoffDateStr = getISTDateString(ninetyDaysAgo);

      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        try {
          const logsSnapshot = await db.collection(`users/${userId}/dailyLogs`)
            .where("dateString", "<", cutoffDateStr)
            .get();

          const batch = db.batch();
          let count = 0;

          logsSnapshot.forEach((logDoc) => {
            batch.delete(logDoc.ref);
            count++;
          });

          if (count > 0) {
            await batch.commit();
            console.log(`Deleted ${count} old logs for user ${userId}`);
          }
        } catch (err) {
          console.error(`Error deleting logs for user ${userId}:`, err);
        }
      }
      
      console.log("cleanOldLogs finished successfully.");
      return null;
    } catch (error) {
      console.error("Error in cleanOldLogs:", error);
      return null;
    }
  });
