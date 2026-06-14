import { v4 as uuidv4 } from 'uuid';
import { getDB } from './sqliteService';
import api from './api';
import { localToUTC, getDeviceTimezone } from '../utils/timezoneUtils';

/**
 * SyncService handles offline-first data operations.
 * It writes to SQLite first, then attempts to sync to MongoDB.
 */

const getNextOccurrenceUTC = (timeStr, timezone) => {
  const now = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  let targetDate = new Date(now);
  targetDate.setHours(hours, minutes, 0, 0);

  // If time has already passed today, set to tomorrow
  if (targetDate < now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  // Convert to local time string format required by localToUTC
  // Format: YYYY-MM-DDTHH:mm
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const localTimeStr = `${year}-${month}-${day}T${timeStr}`;

  return localToUTC(localTimeStr, timezone);
};

export const fetchSchedules = async () => {
  const db = getDB();
  if (!db) return []; // Fallback if DB not ready

  // 1. Try to fetch from SQLite first
  let localTasks = [];
  try {
    const res = await db.query('SELECT * FROM tasks');
    localTasks = res.values || [];
  } catch (error) {
    console.error("SQLite fetch error:", error);
  }

  // 2. Fetch from MongoDB in background and sync SQLite
  syncWithCloud().catch(err => console.error("Background sync error:", err));

  return localTasks;
};

export const addSchedule = async (scheduleData) => {
  const db = getDB();
  const id = uuidv4();
  const timezone = getDeviceTimezone();
  const scheduledTimeUTC = getNextOccurrenceUTC(scheduleData.startTime, timezone);
  const now = Date.now();

  const taskRecord = {
    id,
    title: scheduleData.taskName,
    scheduledTimeUTC,
    completedAt: null,
    isCompleted: false,
    isSynced: false,
    responseText: '',
    createdAt: now,
    updatedAt: now,
    // extra metadata for compatibility
    ...scheduleData
  };

  if (db) {
    await db.run(
      'INSERT INTO tasks (id, title, scheduledTimeUTC, isCompleted, isSynced, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [taskRecord.id, taskRecord.title, taskRecord.scheduledTimeUTC, 0, 0, taskRecord.createdAt, taskRecord.updatedAt]
    );
    // Insert recurring rules
    if (scheduleData.daysOfWeek) {
      await db.run(
        'INSERT INTO recurring_rules (id, taskId, pattern, dayOfWeek) VALUES (?, ?, ?, ?)',
        [uuidv4(), taskRecord.id, 'weekly', scheduleData.daysOfWeek.join(',')]
      );
    }
  }

  // Attempt to sync to MongoDB
  try {
    const res = await api.post('/schedules', taskRecord);
    if (res.data.success && db) {
      await db.run('UPDATE tasks SET isSynced = 1 WHERE id = ?', [taskRecord.id]);
    }
  } catch (err) {
    console.warn("Failed to sync to MongoDB, task saved locally.", err);
  }

  return taskRecord;
};

export const updateSchedule = async (id, updates) => {
  const db = getDB();
  const now = Date.now();
  
  if (db) {
    await db.run('UPDATE tasks SET isSynced = 0, updatedAt = ? WHERE id = ?', [now, id]);
    // update specific fields if needed
    if (updates.taskName) {
      await db.run('UPDATE tasks SET title = ? WHERE id = ?', [updates.taskName, id]);
    }
    if (updates.startTime) {
      const scheduledTimeUTC = getNextOccurrenceUTC(updates.startTime, getDeviceTimezone());
      await db.run('UPDATE tasks SET scheduledTimeUTC = ? WHERE id = ?', [scheduledTimeUTC, id]);
    }
  }

  try {
    const res = await api.patch(`/schedules/${id}`, updates);
    if (res.data.success && db) {
      await db.run('UPDATE tasks SET isSynced = 1 WHERE id = ?', [id]);
    }
    return res.data.schedule;
  } catch (error) {
    console.warn("Failed to sync update to MongoDB, saved locally.", error);
    return { id, ...updates }; // Optimistic return
  }
};

export const deleteSchedule = async (id) => {
  const db = getDB();
  
  if (db) {
    await db.run('DELETE FROM recurring_rules WHERE taskId = ?', [id]);
    await db.run('DELETE FROM tasks WHERE id = ?', [id]);
  }

  try {
    await api.delete(`/schedules/${id}`);
  } catch (error) {
    console.warn("Failed to sync delete to MongoDB, deleted locally.", error);
    // Ideally we'd store deleted IDs to sync them later
  }
};

export const syncWithCloud = async () => {
  const db = getDB();
  if (!db) return;

  // Sync unsynced local creations/updates to cloud
  const unsynced = await db.query('SELECT * FROM tasks WHERE isSynced = 0');
  if (unsynced.values && unsynced.values.length > 0) {
    for (const task of unsynced.values) {
      try {
        // Simple heuristic: if it doesn't exist on server, POST, else PATCH
        // For now, let's just POST and let the backend handle upsert, or rely on a specific endpoint
        await api.post('/schedules/sync', task);
        await db.run('UPDATE tasks SET isSynced = 1 WHERE id = ?', [task.id]);
      } catch (err) {
        console.error("Sync error for task", task.id, err);
      }
    }
  }

  // Fetch from cloud and update local (simplified)
  try {
    const res = await api.get('/schedules');
    if (res.data && res.data.schedules) {
      // In a real app, you'd merge changes properly. 
      // For this plan, we ensure local works first.
    }
  } catch (error) {
    console.error("Error fetching from cloud during sync", error);
  }
};

// Start periodic sync
export const startPeriodicSync = () => {
  setInterval(() => {
    syncWithCloud();
  }, 60000); // Every 60s
};
