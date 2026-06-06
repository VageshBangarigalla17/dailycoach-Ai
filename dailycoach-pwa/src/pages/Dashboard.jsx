import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Timeline from '../components/Timeline';
import ReminderModal from '../components/ReminderModal';
import { showLocalNotification } from '../services/notificationService';

/**
 * Converts an "HH:MM" string to total minutes since midnight.
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Returns "HH:MM" for the current local time.
 */
function nowHHMM() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [todayTasks, setTodayTasks] = useState([]);
  const [todayLogs, setTodayLogs] = useState({});
  const [activeReminderTask, setActiveReminderTask] = useState(null);
  const [reminderType, setReminderType] = useState('start'); // 'start' | 'followup'
  const [currentTime, setCurrentTime] = useState(new Date());

  // Track which reminders we've already fired so we don't re-trigger
  const firedRemindersRef = useRef(new Set());

  // ----------------------------------------------------------------
  // Fetch today's tasks and logs
  // ----------------------------------------------------------------
  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        const [schedulesRes, logsRes] = await Promise.all([
          api.get('/schedules?today=true'),
          api.get('/logs/today')
        ]);

        if (schedulesRes.data.success) {
          setTodayTasks(schedulesRes.data.schedules);
          console.log('[Dashboard] Loaded tasks:', schedulesRes.data.schedules.length);
        }

        if (logsRes.data.success) {
          const logsObj = {};
          logsRes.data.logs.forEach(log => {
            logsObj[log.scheduleId] = { status: log.status, completedAt: log.completedAt };
          });
          setTodayLogs(logsObj);
          console.log('[Dashboard] Loaded logs:', Object.keys(logsObj).length);
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching today's data:", error);
      }
    };

    if (currentUser) {
      fetchTodayData();
    }
  }, [currentUser]);

  // ----------------------------------------------------------------
  // 1-SECOND polling — check for start-time and end-time triggers
  // ----------------------------------------------------------------
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      setCurrentTime(now);

      const currentTimeStr = nowHHMM();
      const currentTotalMins = timeToMinutes(currentTimeStr);

      // Don't trigger anything while a modal is already open
      if (activeReminderTask) return;

      for (const task of todayTasks) {
        const taskStartMins = timeToMinutes(task.startTime);
        const taskEndMins = timeToMinutes(task.endTime);
        const taskId = task.id || task._id;
        const hasLog = !!todayLogs[taskId];

        // --- START TRIGGER: fire at exact start time ---
        const startKey = `start-${taskId}`;
        if (
          currentTotalMins === taskStartMins &&
          !hasLog &&
          !firedRemindersRef.current.has(startKey)
        ) {
          console.log(`[Dashboard] ⏰ START trigger: ${task.taskName} at ${currentTimeStr}`);
          firedRemindersRef.current.add(startKey);
          setReminderType('start');
          setActiveReminderTask(task);
          return; // only one reminder at a time
        }

        // --- FOLLOW-UP TRIGGER: fire at exact end time ---
        const followupKey = `followup-${taskId}`;
        if (
          currentTotalMins === taskEndMins &&
          !hasLog &&
          !firedRemindersRef.current.has(followupKey)
        ) {
          console.log(`[Dashboard] ⏰ FOLLOW-UP trigger: ${task.taskName} at ${currentTimeStr}`);
          firedRemindersRef.current.add(followupKey);
          setReminderType('followup');
          setActiveReminderTask(task);
          return;
        }
      }
    };

    // Fire immediately, then every 1 second
    checkReminders();
    const intervalId = setInterval(checkReminders, 1000);
    return () => clearInterval(intervalId);
  }, [todayTasks, todayLogs, activeReminderTask]);

  // ----------------------------------------------------------------
  // Handle task completion from the ReminderModal
  // ----------------------------------------------------------------
  const handleReminderComplete = useCallback(async (status, voiceResponse) => {
    if (!activeReminderTask) return;

    const taskId = activeReminderTask.id || activeReminderTask._id;
    const today = new Date().toISOString().split('T')[0];

    try {
      const res = await api.post('/logs', {
        scheduleId: taskId,
        date: today,
        status: status,
        voiceResponse: voiceResponse || (status === 'done' ? 'yes' : 'no'),
        completedAt: status === 'missed' ? null : new Date().toISOString()
      });

      if (res.data.success) {
        console.log(`[Dashboard] Task "${activeReminderTask.taskName}" logged as ${status}`);
        setTodayLogs(prev => ({
          ...prev,
          [taskId]: {
            status: res.data.log.status,
            completedAt: res.data.log.completedAt
          }
        }));
      }
    } catch (error) {
      console.error('[Dashboard] Failed to log task completion:', error);
      // Still update locally so the UI reflects the change
      setTodayLogs(prev => ({
        ...prev,
        [taskId]: { status, completedAt: status === 'missed' ? null : new Date().toISOString() }
      }));
    }

    setActiveReminderTask(null);
  }, [activeReminderTask]);

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
  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      {/* Header */}
      <header className="mb-8 pt-6">
        <h1 className="text-3xl font-bold font-sans text-white mb-2">
          {getGreeting()}, {currentUser?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-slate-400 font-sans">
          {completedCount}/{totalCount} tasks completed today
        </p>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 mt-4 overflow-hidden border border-slate-700">
          <div
            className="bg-gradient-to-r from-morning to-done h-3 rounded-full transition-all duration-1000 ease-out"
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
        <h2 className="text-xl font-bold text-slate-200 mb-6 font-sans">Today's Timeline</h2>
        <Timeline tasks={todayTasks} logs={todayLogs} currentTime={currentTime} />
      </main>

      {/* Reminder Modal */}
      {activeReminderTask && (
        <ReminderModal
          task={activeReminderTask}
          userName={currentUser?.name?.split(' ')[0]}
          reminderType={reminderType}
          onComplete={handleReminderComplete}
          onClose={() => setActiveReminderTask(null)}
        />
      )}
    </div>
  );
}
