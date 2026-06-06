import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSchedule } from '../contexts/ScheduleContext';
import Timeline from '../components/Timeline';
import ReminderModal from '../components/ReminderModal';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { schedules, todayLogs, addLog } = useSchedule();
  
  const [activeReminderTask, setActiveReminderTask] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get tasks for today
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const todayTasks = schedules.filter(s => s.days.includes(todayName) && s.isActive);

  // Calculate progress
  const completedCount = todayTasks.filter(t => todayLogs[t.id]?.status === 'done').length;
  const totalCount = todayTasks.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Client-side reminder trigger logic (30s polling)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      setCurrentTime(now);
      
      const currentHrs = now.getHours().toString().padStart(2, '0');
      const currentMins = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHrs}:${currentMins}`;

      // Check for start time triggers
      todayTasks.forEach(task => {
        if (task.startTime === currentTimeStr && !todayLogs[task.id]) {
          setActiveReminderTask(task);
        }
      });

      // Check for follow-up triggers (5 mins after start time)
      todayTasks.forEach(task => {
        const [startHrs, startMins] = task.startTime.split(':').map(Number);
        const startTotalMins = startHrs * 60 + startMins;
        const currentTotalMins = now.getHours() * 60 + now.getMinutes();
        
        if (currentTotalMins === startTotalMins + 5 && !todayLogs[task.id]) {
          setActiveReminderTask(task);
        }
      });
    };

    // Initial check and set interval
    checkReminders();
    const intervalId = setInterval(checkReminders, 30000); // 30 seconds
    return () => clearInterval(intervalId);
  }, [todayTasks, todayLogs]);

  const handleReminderComplete = async (status) => {
    if (activeReminderTask) {
      await addLog(activeReminderTask.id, status);
      setActiveReminderTask(null);
    }
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning 🌅';
    if (hour < 17) return 'Good afternoon 🌤️';
    return 'Good evening 🌙';
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      {/* Header section */}
      <header className="mb-8 pt-6">
        <h1 className="text-3xl font-bold font-sans text-white mb-2">
          {getGreeting()}, {currentUser?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-slate-400 font-sans">
          {completedCount}/{totalCount} tasks completed today
        </p>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 mt-4 overflow-hidden border border-slate-700">
          <div 
            className="bg-gradient-to-r from-morning to-done h-3 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </header>

      {/* Timeline section */}
      <main>
        <h2 className="text-xl font-bold text-slate-200 mb-6 font-sans">Today's Timeline</h2>
        <Timeline tasks={todayTasks} logs={todayLogs} currentTime={currentTime} />
      </main>

      {/* Reminder Modal */}
      {activeReminderTask && (
        <ReminderModal 
          task={activeReminderTask} 
          userName={currentUser?.name?.split(' ')[0]}
          onComplete={handleReminderComplete}
          onClose={() => setActiveReminderTask(null)}
        />
      )}
    </div>
  );
}
