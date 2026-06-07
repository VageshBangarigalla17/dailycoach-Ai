import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import ReminderModal from './ReminderModal';
import api from '../services/api';
import confetti from 'canvas-confetti';

export default function GlobalReminder() {
  const { currentUser } = useAuth();
  const [activeReminderTask, setActiveReminderTask] = useState(null);
  const [reminderType, setReminderType] = useState('start');
  const activeReminderTaskRef = useRef(null);

  useEffect(() => {
    activeReminderTaskRef.current = activeReminderTask;
  }, [activeReminderTask]);

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

    return () => {
      socket.disconnect();
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
