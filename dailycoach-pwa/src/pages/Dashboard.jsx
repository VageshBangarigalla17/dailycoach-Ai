import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import confetti from 'canvas-confetti';
import Timeline from '../components/Timeline';
import ReminderModal from '../components/ReminderModal';
import { showLocalNotification } from '../services/notificationService';
import { io } from 'socket.io-client';

/**
 * Converts an "HH:MM" string to total seconds since midnight.
 */
function timeToSeconds(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60;
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [todayTasks, setTodayTasks] = useState([]);
  const [todayLogs, setTodayLogs] = useState({});
  const [activeReminderTask, setActiveReminderTask] = useState(null);
  const [reminderType, setReminderType] = useState('start'); // 'start' | 'followup'
  const [currentTime, setCurrentTime] = useState(new Date());

  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[Dashboard] Screen Wake Lock activated');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('[Dashboard] Screen Wake Lock released');
        });
      }
    } catch (err) {
      console.error('[Dashboard] Wake Lock error:', err.name, err.message);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Request Wake Lock on mount and visibility change
  useEffect(() => {
    requestWakeLock();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  const firedRemindersRef = useRef(new Set());
  const retryTimeoutsRef = useRef({}); // { taskId: timeoutId }
  const retryCountsRef = useRef({});   // { taskId: count }
  const todayLogsRef = useRef(todayLogs);
  const todayTasksRef = useRef([]);

  useEffect(() => {
    todayLogsRef.current = todayLogs;
  }, [todayLogs]);

  useEffect(() => {
    todayTasksRef.current = todayTasks;
  }, [todayTasks]);

  const fetchTodayData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [schedulesRes, logsRes] = await Promise.all([
        api.get('/schedules?today=true'),
        api.get('/logs/today')
      ]);

      if (schedulesRes.data.success) {
        setTodayTasks(schedulesRes.data.schedules);
      }

      if (logsRes.data.success) {
        const logsObj = {};
        logsRes.data.logs.forEach(log => {
          logsObj[log.scheduleId] = { status: log.status, completedAt: log.completedAt };
        });
        setTodayLogs(logsObj);
      }
    } catch (error) {
      console.error("[Dashboard] Error fetching today's data:", error);
    }
  }, [currentUser]);

  // ----------------------------------------------------------------
  // Fetch today's tasks and logs (initial + 10s poll)
  // ----------------------------------------------------------------
  useEffect(() => {
    fetchTodayData();
    const refreshInterval = setInterval(fetchTodayData, 10000); // 10-second data refresh
    return () => clearInterval(refreshInterval);
  }, [fetchTodayData]);

  // Keep the clock updated for the Timeline component and real-time clock display every 1 second
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);


  // ----------------------------------------------------------------
  // Progress calculations
  // ----------------------------------------------------------------
  const completedCount = todayTasks.filter(t => {
    const id = t.id || t._id;
    return todayLogs[id]?.status === 'done' || todayLogs[id]?.status === 'late';
  }).length;
  const totalCount = todayTasks.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const doneCount = todayTasks.filter(t => todayLogs[t.id || t._id]?.status === 'done').length;
  const lateCount = todayTasks.filter(t => todayLogs[t.id || t._id]?.status === 'late').length;
  const missedCount = todayTasks.filter(t => todayLogs[t.id || t._id]?.status === 'missed').length;

  // ----------------------------------------------------------------
  // Greeting
  // ----------------------------------------------------------------
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning 🌅';
    if (hour < 17) return 'Good afternoon 🌤️';
    return 'Good evening 🌙';
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  const voiceOptions = {
    rate: currentUser?.preferredVoiceSpeed || 1.0,
    pitch: currentUser?.preferredVoiceGender === 'male' ? 0.8 : 1.2
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      {/* Header */}
      <header className="mb-8 pt-6">
        <h1 className="text-3xl font-bold font-sans text-white mb-2 tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          {getGreeting()}, {currentUser?.name?.split(' ')[0] || 'User'}
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-slate-400 font-sans font-medium tracking-wide">
            {completedCount}/{totalCount} tasks completed today
          </p>
          <div className="text-morning font-mono font-bold tracking-wider bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-700/50 shadow-[0_0_15px_rgba(14,165,233,0.15)] flex items-center">
            <span className="w-2 h-2 rounded-full bg-morning animate-pulse mr-2"></span>
            {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-900/80 rounded-full h-3 mt-5 overflow-hidden border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          <div
            className="bg-gradient-to-r from-morning via-done to-morning h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)] bg-[length:200%_100%] animate-pulse"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Quick stats row */}
        {totalCount > 0 && (
          <div className="flex justify-between mt-3 text-xs font-mono">
            <span className="text-done">✅ {doneCount} on-time</span>
            <span className="text-late">⏱️ {lateCount} late</span>
            <span className="text-missed">❌ {missedCount} missed</span>
          </div>
        )}
      </header>

      {/* Timeline */}
      <main>
        <h2 className="text-xl font-bold text-slate-200 mb-6 font-sans tracking-wide">Today's Timeline</h2>
        <Timeline tasks={todayTasks} logs={todayLogs} currentTime={currentTime} />
      </main>

    </div>
  );
}
