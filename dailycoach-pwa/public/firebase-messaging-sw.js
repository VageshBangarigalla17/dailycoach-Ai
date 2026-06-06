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
  const notificationTitle = payload.notification?.title || payload.data?.title || 'DailyCoach AI Reminder';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/icon-192.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
