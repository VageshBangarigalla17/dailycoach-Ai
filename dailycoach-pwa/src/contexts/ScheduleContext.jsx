import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

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
    async function fetchData() {
      if (currentUser) {
        try {
          const [schedulesRes, logsRes] = await Promise.all([
            api.get('/schedules'),
            api.get('/logs')
          ]);
          setSchedules(schedulesRes.data);
          
          // Map logs to todayLogs format
          const logsObj = {};
          logsRes.data.forEach(log => {
             logsObj[log.taskId] = {
               status: log.status,
               completedAt: log.completedAt,
               _id: log._id
             };
          });
          setTodayLogs(logsObj);
        } catch (error) {
          console.error("Error fetching schedules or logs:", error);
        }
        setLoading(false);
      } else {
        setSchedules([]);
        setTodayLogs({});
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser]);

  async function addSchedule(scheduleData) {
    try {
      const response = await api.post('/schedules', scheduleData);
      setSchedules((prev) => [...prev, response.data]);
      return response.data;
    } catch (error) {
      console.error("Error adding schedule:", error);
      throw error;
    }
  }

  async function updateSchedule(id, updates) {
    try {
      const response = await api.patch(`/schedules/${id}`, updates);
      setSchedules((prev) =>
        prev.map((s) => (s._id === id ? response.data : s))
      );
    } catch (error) {
      console.error("Error updating schedule:", error);
      throw error;
    }
  }

  async function deleteSchedule(id) {
    try {
      await api.delete(`/schedules/${id}`);
      setSchedules((prev) => prev.filter((s) => s._id !== id));
    } catch (error) {
      console.error("Error deleting schedule:", error);
      throw error;
    }
  }
  
  async function addLog(taskId, status) {
    try {
      const response = await api.post('/logs', {
        taskId,
        status,
        scheduledTime: new Date().toISOString() // Or get it from the schedule
      });
      setTodayLogs((prev) => ({
        ...prev,
        [taskId]: {
          status: response.data.status,
          completedAt: response.data.completedAt,
          _id: response.data._id
        }
      }));
    } catch (error) {
      console.error("Error adding log:", error);
      throw error;
    }
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
