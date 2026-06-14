/**
 * FIX #1: Enhanced SQLite Service with Robust Error Handling
 * 
 * Issues Fixed:
 * - Silent failures during database initialization
 * - Missing error logging for debugging
 * - Task not appearing after creation
 * - Sync blocking offline mode
 * 
 * REPLACE: src/services/sqliteService.js with this file
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db = null;
let isInitialized = false;

// DEBUG FLAG - Set to true to see detailed logs
const DEBUG = true;

function log(message, data = null) {
  if (DEBUG) {
    console.log(`[SQLiteService] ${message}`, data || '');
  }
}

function logError(message, error) {
  console.error(`[SQLiteService ERROR] ${message}`, error);
}

/**
 * Initialize SQLite database with enhanced error handling
 * CRITICAL FIX: Better error messages and status checking
 */
export const initDatabase = async () => {
  try {
    log('Starting database initialization...');

    if (isInitialized && db) {
      log('Database already initialized, skipping...');
      return true;
    }

    // Check platform
    const platform = Capacitor.getPlatform();
    log(`Running on platform: ${platform}`);

    if (platform === 'web') {
      logError('WARNING', 'SQLite on web requires jeep-sqlite. Attempting to continue...');
    }

    // Create connection with error handling
    log('Creating database connection...');
    db = await sqlite.createConnection(
      'dailycoach',      // database name
      false,             // logging
      'no-encryption',   // encryption mode
      1,                 // version
      false              // readonly
    );

    if (!db) {
      throw new Error('Failed to create database connection - db is null');
    }

    log('Opening database...');
    await db.open();
    log('Database connection opened successfully');

    // Create tables with detailed error handling
    log('Creating tasks table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        scheduledTimeUTC INTEGER NOT NULL,
        completedAt INTEGER,
        isCompleted BOOLEAN DEFAULT 0,
        isSynced BOOLEAN DEFAULT 0,
        responseText TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);
    log('✅ Tasks table created');

    log('Creating dailyLogs table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS dailyLogs (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        completedAt INTEGER,
        scheduledTimeUTC INTEGER,
        isSynced BOOLEAN DEFAULT 0,
        FOREIGN KEY(taskId) REFERENCES tasks(id)
      );
    `);
    log('✅ DailyLogs table created');

    // Create indices for fast queries
    log('Creating indices...');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_tasks_time ON tasks(scheduledTimeUTC);');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_tasks_synced ON tasks(isSynced);');
    log('✅ Indices created');

    // Verify tables exist
    log('Verifying tables...');
    const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table'");
    log('Existing tables:', tables);

    isInitialized = true;
    log('✅ Database initialization complete!');
    return true;

  } catch (error) {
    logError('CRITICAL: Database initialization failed', error);
    logError('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Insert task with enhanced debugging
 * CRITICAL FIX: Log task data and verify insertion
 */
export const insertTask = async (taskData) => {
  if (!db) {
    logError('insertTask', 'Database not initialized');
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  try {
    log('Inserting task:', taskData);

    const now = Date.now();
    const taskWithTimestamps = {
      ...taskData,
      createdAt: now,
      updatedAt: now,
      isSynced: 0,
      isCompleted: 0
    };

    log('Task with timestamps:', taskWithTimestamps);

    // Insert into database
    await db.run(
      `INSERT INTO tasks (id, title, scheduledTimeUTC, isCompleted, isSynced, responseText, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskWithTimestamps.id,
        taskWithTimestamps.title,
        taskWithTimestamps.scheduledTimeUTC,
        taskWithTimestamps.isCompleted,
        taskWithTimestamps.isSynced,
        taskWithTimestamps.responseText || '',
        taskWithTimestamps.createdAt,
        taskWithTimestamps.updatedAt
      ]
    );

    log('✅ Task inserted successfully');

    // Verify insertion
    const verification = await getTaskById(taskWithTimestamps.id);
    log('Verification - Task from DB:', verification);

    if (!verification) {
      logError('insertTask', 'Task inserted but could not be verified!');
    }

    return taskWithTimestamps;

  } catch (error) {
    logError('insertTask failed', error);
    throw error;
  }
};

/**
 * Update task with verification
 */
export const updateTask = async (taskId, updateData) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    log(`Updating task ${taskId}:`, updateData);

    const now = Date.now();
    const keys = Object.keys(updateData);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updateData), 0, now, taskId]; // 0 = isSynced false

    await db.run(
      `UPDATE tasks SET ${setClause}, isSynced = ?, updatedAt = ? WHERE id = ?`,
      values
    );

    log('✅ Task updated successfully');

    // Verify update
    const updated = await getTaskById(taskId);
    log('Verification - Updated task:', updated);

    return true;

  } catch (error) {
    logError('updateTask failed', error);
    throw error;
  }
};

/**
 * Get all tasks - CRITICAL: This must work offline
 */
export const getTasks = async () => {
  if (!db) {
    logError('getTasks', 'Database not initialized');
    throw new Error('Database not initialized');
  }

  try {
    log('Fetching all tasks from SQLite...');

    const result = await db.query('SELECT * FROM tasks ORDER BY scheduledTimeUTC ASC');
    const tasks = result.values || [];

    log(`✅ Retrieved ${tasks.length} tasks from local database`);
    log('Tasks:', tasks);

    return tasks;

  } catch (error) {
    logError('getTasks failed', error);
    // CRITICAL: Return empty array instead of throwing
    // This prevents app from crashing if database has issues
    return [];
  }
};

/**
 * Get single task by ID
 */
export const getTaskById = async (taskId) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const result = await db.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    const task = result.values && result.values.length > 0 ? result.values[0] : null;

    log(`Retrieved task ${taskId}:`, task);

    return task;

  } catch (error) {
    logError(`getTaskById(${taskId}) failed`, error);
    return null;
  }
};

/**
 * Delete task
 */
export const deleteTask = async (taskId) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    log(`Deleting task ${taskId}...`);

    await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
    await db.run('DELETE FROM dailyLogs WHERE taskId = ?', [taskId]);

    log('✅ Task deleted');
    return true;

  } catch (error) {
    logError(`deleteTask(${taskId}) failed`, error);
    throw error;
  }
};

/**
 * Get today's tasks
 */
export const getTodaysTasks = async () => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    log(`Fetching tasks between ${startOfDay} and ${endOfDay}`);

    const result = await db.query(
      'SELECT * FROM tasks WHERE scheduledTimeUTC >= ? AND scheduledTimeUTC <= ? ORDER BY scheduledTimeUTC ASC',
      [startOfDay, endOfDay]
    );

    const tasks = result.values || [];
    log(`✅ Retrieved ${tasks.length} tasks for today`);

    return tasks;

  } catch (error) {
    logError('getTodaysTasks failed', error);
    return [];
  }
};

/**
 * Mark task as synced
 */
export const markTaskAsSynced = async (taskId) => {
  if (!db) {
    return;
  }

  try {
    log(`Marking task ${taskId} as synced...`);
    await db.run('UPDATE tasks SET isSynced = 1 WHERE id = ?', [taskId]);
    log('✅ Task marked as synced');

  } catch (error) {
    logError(`markTaskAsSynced(${taskId}) failed`, error);
  }
};

/**
 * Get unsynced tasks count
 */
export const getUnsyncedCount = async () => {
  if (!db) {
    return 0;
  }

  try {
    const result = await db.query('SELECT COUNT(*) as count FROM tasks WHERE isSynced = 0');
    const count = result.values[0].count;
    log(`Unsynced tasks count: ${count}`);
    return count;

  } catch (error) {
    logError('getUnsyncedCount failed', error);
    return 0;
  }
};

/**
 * Clear all data (for testing)
 */
export const clearDatabase = async () => {
  if (!db) return;

  try {
    log('🗑️  CLEARING DATABASE');
    await db.run('DELETE FROM dailyLogs');
    await db.run('DELETE FROM tasks');
    log('✅ Database cleared');

  } catch (error) {
    logError('clearDatabase failed', error);
  }
};

/**
 * Get database instance
 */
export const getDB = () => db;

/**
 * Check if database is ready
 */
export const isDatabaseReady = () => isInitialized && db !== null;

/**
 * Force reinitialize database (for testing/debugging)
 */
export const reinitializeDatabase = async () => {
  log('Force reinitializing database...');
  isInitialized = false;
  db = null;
  return await initDatabase();
};

export default {
  initDatabase,
  insertTask,
  updateTask,
  getTasks,
  getTaskById,
  deleteTask,
  getTodaysTasks,
  markTaskAsSynced,
  getUnsyncedCount,
  clearDatabase,
  getDB,
  isDatabaseReady,
  reinitializeDatabase
};
