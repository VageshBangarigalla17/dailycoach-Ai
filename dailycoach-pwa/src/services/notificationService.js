import { db, setupMessaging } from '../config/firebase';
import { getToken } from 'firebase/messaging';
import api from './api';

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      return true;
    } else {
      console.warn('Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const getFCMToken = async () => {
  try {
    const messaging = await setupMessaging();
    if (!messaging) return null;
    
    // Get the ALREADY REGISTERED Vite PWA service worker
    let registration;
    try {
      registration = await navigator.serviceWorker.ready;
    } catch (swError) {
      console.warn('Failed to get active service worker:', swError);
    }
    
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('VITE_FIREBASE_VAPID_KEY is missing in .env! Push notifications require a VAPID key.');
    }
    
    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: registration
    });
    
    if (currentToken) {
      console.log('FCM Token retrieved:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const saveFCMToken = async (userId, token) => {
  try {
    if (!token) return;
    await api.post('/users/fcm-token', { token });
    console.log('FCM Token saved to backend API');
  } catch (error) {
    console.error('Error saving FCM Token to backend:', error);
  }
};

export const showLocalNotification = (title, body) => {
  try {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }
    
    const show = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification(title, { body, icon: '/icon-192.png' });
        } else {
          new Notification(title, { body, icon: '/icon-192.png' });
        }
      } catch (e) {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
    };

    if (Notification.permission === "granted") {
      show();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") show();
      });
    }
  } catch (error) {
    console.error('Error showing local notification:', error);
  }
};
