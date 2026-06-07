import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import ReminderModal from './ReminderModal';
import api from '../services/api';
import confetti from 'canvas-confetti';
import { getFCMToken, saveFCMToken } from '../services/notificationService';

export default function GlobalReminder() {
  const { currentUser } = useAuth();
  const [activeReminderTask, setActiveReminderTask] = useState(null);
  const [reminderType, setReminderType] = useState('start');
  const activeReminderTaskRef = useRef(null);

  useEffect(() => {
    activeReminderTaskRef.current = activeReminderTask;
  }, [activeReminderTask]);

  // Handle Cold-Start Notification Clicks (when app is fully closed)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const taskId = params.get('openReminder');
      
      if (taskId && !activeReminderTaskRef.current) {
        console.log('[GlobalReminder] 📲 Cold start URL trigger:', taskId);
        setReminderType(params.get('type') || 'start');
        setActiveReminderTask({
          id: taskId,
          _id: taskId,
          taskName: params.get('taskName') || 'Task Reminder',
          startTime: params.get('startTime') || '',
          endTime: params.get('endTime') || ''
        });
        
        // Clean up the URL without reloading the page
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const socketUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api$/, '') || 'http://localhost:5000';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('[GlobalReminder] Connected to WebSocket server');
      socket.emit('register', currentUser.id || currentUser._id);
    });

    const handleReminder = (data) => {
      if (activeReminderTaskRef.current) return;
      
      console.log(`[GlobalReminder] ⏰ WebSocket trigger: ${data.taskName} (${data.type})`);
      
      setReminderType(data.type);
      setActiveReminderTask({
        id: data.scheduleId,
        _id: data.scheduleId,
        taskName: data.taskName,
        startTime: data.startTime,
        endTime: data.endTime
      });
    };

    socket.on('reminder:start', handleReminder);
    socket.on('reminder:followup', handleReminder);
    socket.on('reminder:loop', handleReminder);

    // Listen for Service Worker messages (e.g. from clicking a push notification)
    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        console.log('[GlobalReminder] 📲 Service Worker trigger:', event.data);
        
        if (activeReminderTaskRef.current) return;
        
        // The service worker passes the payload data
        setReminderType(event.data.reminderType || 'start');
        setActiveReminderTask({
          id: event.data.taskId,
          _id: event.data.taskId,
          taskName: event.data.taskName || 'Task Reminder',
          startTime: event.data.startTime || '',
          endTime: event.data.endTime || ''
        });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // Auto-sync FCM Token if permission is already granted
    const syncToken = async () => {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const token = await getFCMToken();
          if (token) {
            await saveFCMToken(currentUser.id || currentUser._id, token);
          }
        } catch (error) {
          console.error('[GlobalReminder] Failed to auto-sync FCM token:', error);
        }
      }
    };
    syncToken();

    return () => {
      socket.disconnect();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [currentUser]);

  const handleReminderComplete = useCallback(async (status, voiceResponse) => {
    if (!activeReminderTask) return;

    const task = activeReminderTask;
    const taskId = task.id || task._id;
    const today = new Date().toISOString().split('T')[0];
    const currentRemType = reminderType;
    
    try {
      const res = await api.post('/logs', {
        scheduleId: taskId,
        date: today,
        status: status,
        reminderType: currentRemType,
        voiceResponse: voiceResponse || (status === 'done' ? 'yes' : 'no'),
        completedAt: status === 'missed' || status === 'no-response' ? null : new Date().toISOString(),
        scheduledTime: task.startTime
      });

      if (res.data.success && (status === 'done' || status === 'late')) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3B82F6', '#22C55E', '#F97316'],
          zIndex: 9999
        });
      }
    } catch (error) {
      console.error('[GlobalReminder] Failed to log task completion:', error);
    }
  }, [activeReminderTask, reminderType]);

  const voiceOptions = {
    rate: currentUser?.preferredVoiceSpeed || 1.0,
    pitch: currentUser?.preferredVoiceGender === 'male' ? 0.8 : 1.2
  };

  if (!activeReminderTask) return null;

  return (
    <ReminderModal
      task={activeReminderTask}
      userName={currentUser?.name?.split(' ')[0]}
      reminderType={reminderType}
      voiceOptions={voiceOptions}
      onComplete={handleReminderComplete}
      onClose={() => setActiveReminderTask(null)}
    />
  );
}
