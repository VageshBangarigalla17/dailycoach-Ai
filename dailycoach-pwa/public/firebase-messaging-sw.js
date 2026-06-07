importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// We need to use the actual config here later when available.
// The user will need to update this with their config.
firebase.initializeApp({
  apiKey: "AIzaSyD80JhZI83fu1jRq4tdnRPQnBd-OJkJ5YU",
  authDomain: "dailycoach-ai.firebaseapp.com",
  projectId: "dailycoach-ai",
  storageBucket: "dailycoach-ai.firebasestorage.app",
  messagingSenderId: "945626958609",
  appId: "1:945626958609:web:5a2e294752a474f4b55ab0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationType = payload.data?.type || 'reminder';
  const taskName = payload.data?.taskName || 'Task';

  let notificationTitle;
  let notificationBody;

  if (notificationType === 'followup') {
    notificationTitle = 'DailyCoach Follow-up ⏰';
    notificationBody = payload.notification?.body || `Your ${taskName} time just ended. Did you complete it?`;
  } else if (notificationType === 'second-chance') {
    notificationTitle = 'DailyCoach Final Check-in ⏰';
    notificationBody = payload.notification?.body || `Checking in on ${taskName}. Have you completed it yet?`;
  } else if (notificationType === 'summary') {
    notificationTitle = payload.notification?.title || 'DailyCoach Summary 📊';
    notificationBody = payload.notification?.body || '';
  } else {
    notificationTitle = 'DailyCoach Reminder 🔔';
    notificationBody = payload.notification?.body || `Time for: ${taskName}`;
  }

  const notificationOptions = {
    body: notificationBody,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `dailycoach-${notificationType}-${payload.data?.taskId || 'general'}`,
    renotify: true,
    requireInteraction: notificationType === 'followup' || notificationType === 'second-chance',
    data: {
      ...payload.data,
      url: `/?openReminder=${payload.data?.taskId || ''}&type=${notificationType}`
    },
    actions: notificationType !== 'summary' ? [
      { action: 'yes', title: notificationType === 'followup' || notificationType === 'second-chance' ? '✅ Yes, Done' : '✅ OK, I\'ll Start' },
      { action: 'no', title: notificationType === 'followup' || notificationType === 'second-chance' ? '❌ No, Missed' : '⏭️ Not Now' }
    ] : []
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the app and route to the right modal
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.action, event.notification.data);

  event.notification.close();

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            action: event.action || 'open',
            taskId: notifData.taskId || '',
            reminderType: notifData.type || 'reminder',
            taskName: notifData.taskName || ''
          });
          return;
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
