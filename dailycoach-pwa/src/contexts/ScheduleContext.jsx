import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ScheduleContext = createContext();

export function useSchedule() {
  return useContext(ScheduleContext);
}

export function ScheduleProvider({ children }) {
  const { currentUser } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [todayLogs, setTodayLogs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      // Mock loading data
      const mockSchedules = [
        {
          id: '1',
          taskName: 'Morning Workout',
          startTime: '06:00',
          endTime: '07:00',
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          isActive: true,
          color: 'morning'
        },
        {
          id: '2',
          taskName: 'Deep Work',
          startTime: '10:00',
          endTime: '12:00',
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          isActive: true,
          color: 'morning'
        },
        {
          id: '3',
          taskName: 'Evening Reading',
          startTime: '20:00',
          endTime: '21:00',
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          isActive: true,
          color: 'evening'
        }
      ];
      setSchedules(mockSchedules);
      setTodayLogs({});
      setLoading(false);
    } else {
      setSchedules([]);
      setTodayLogs({});
      setLoading(false);
    }
  }, [currentUser]);

  function addSchedule(scheduleData) {
    return new Promise((resolve) => {
      const newSchedule = {
        ...scheduleData,
        id: Date.now().toString(),
        isActive: true,
      };
      setSchedules((prev) => [...prev, newSchedule]);
      resolve(newSchedule);
    });
  }

  function updateSchedule(id, updates) {
    return new Promise((resolve) => {
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
      resolve();
    });
  }

  function deleteSchedule(id) {
    return new Promise((resolve) => {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      resolve();
    });
  }
  
  function addLog(taskId, status) {
    return new Promise((resolve) => {
       setTodayLogs((prev) => ({
         ...prev,
         [taskId]: {
           status,
           completedAt: new Date().toISOString()
         }
       }));
       resolve();
    });
  }

  const value = {
    schedules,
    todayLogs,
    loading,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    addLog
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}
