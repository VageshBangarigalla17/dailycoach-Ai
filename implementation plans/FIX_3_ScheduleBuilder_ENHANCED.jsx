/**
 * FIX #3: Enhanced Schedule Builder Component
 * 
 * Issues Fixed:
 * - Task list not showing after task is added
 * - UI not refreshing after insertTask
 * - Missing state management for tasks
 * - Need to re-fetch tasks after creation
 * 
 * REPLACE: src/pages/ScheduleBuilder.jsx with this file
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, Plus, Trash2, Clock, CheckCircle } from 'lucide-react';
import { getSchedules, addSchedule, removeSchedule } from '../services/scheduleService';
import { getTasks } from '../services/sqliteService';
import { utcToLocalTime, getCurrentTimezone } from '../utils/timezoneUtils';

export default function ScheduleBuilder() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    taskName: '',
    startTime: '09:00',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const timezone = getCurrentTimezone();

  /**
   * FIX: Load tasks from database
   * This must be called on component mount and after task creation
   */
  const loadTasks = useCallback(async () => {
    try {
      console.log('[ScheduleBuilder] Loading tasks from database...');
      setLoading(true);
      setError(null);

      // Fetch from local SQLite (not from API)
      const tasksFromDB = await getTasks();
      console.log('[ScheduleBuilder] Tasks loaded from SQLite:', tasksFromDB);

      setTasks(tasksFromDB || []);

      // Show success if there are tasks
      if (tasksFromDB && tasksFromDB.length > 0) {
        console.log(`[ScheduleBuilder] ✅ Loaded ${tasksFromDB.length} tasks`);
      }

    } catch (err) {
      console.error('[ScheduleBuilder] Error loading tasks:', err);
      setError('Failed to load tasks from database');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load tasks on component mount
   */
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * FIX: Handle task creation with proper state management
   */
  const handleAddSchedule = async (e) => {
    e.preventDefault();

    if (!formData.taskName.trim()) {
      setError('Please enter a task name');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage('');

      console.log('[ScheduleBuilder] Creating task:', formData);

      // Create the task
      const newTask = await addSchedule(formData);
      console.log('[ScheduleBuilder] Task created:', newTask);

      // Show success message
      setSuccessMessage(`✅ Task "${formData.taskName}" created successfully!`);

      // CRITICAL FIX: Reload tasks from database to show in UI
      console.log('[ScheduleBuilder] Reloading tasks after creation...');
      setTimeout(() => {
        loadTasks();
      }, 500); // Small delay to ensure database write completes

      // Reset form
      setFormData({
        taskName: '',
        startTime: '09:00',
        description: ''
      });
      setShowForm(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (err) {
      console.error('[ScheduleBuilder] Error creating task:', err);
      setError(`Failed to create task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle task deletion
   */
  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!window.confirm(`Delete task "${taskTitle}"?`)) {
      return;
    }

    try {
      console.log('[ScheduleBuilder] Deleting task:', taskId);
      await removeSchedule(taskId);

      // Reload tasks
      setSuccessMessage(`✅ Task deleted`);
      await loadTasks();

      setTimeout(() => {
        setSuccessMessage('');
      }, 2000);

    } catch (err) {
      console.error('[ScheduleBuilder] Error deleting task:', err);
      setError('Failed to delete task');
    }
  };

  /**
   * Format time for display
   */
  const formatTaskTime = (task) => {
    try {
      const localTime = utcToLocalTime(task.scheduledTimeUTC, timezone, 'hh:mm a');
      return localTime || 'Invalid time';
    } catch (err) {
      console.error('[ScheduleBuilder] Error formatting time:', err);
      return 'Error';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-slate-900 p-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <ChevronLeft className="text-slate-400 cursor-pointer" size={24} />
        <div>
          <h1 className="text-3xl font-bold text-white">Your Schedule</h1>
          <p className="text-sm text-slate-400">Build your ideal day</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg mb-4">
          {successMessage}
        </div>
      )}

      {/* Add Schedule Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl mb-6 transition-all"
      >
        <Plus size={20} />
        {showForm ? 'Cancel' : 'Add Schedule'}
      </button>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
          <form onSubmit={handleAddSchedule} className="space-y-4">
            {/* Task Name */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                What's the task?
              </label>
              <input
                type="text"
                name="taskName"
                value={formData.taskName}
                onChange={handleInputChange}
                placeholder="e.g., Morning Run, Review Report"
                className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Notes (optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add any details or reminders..."
                className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 h-20"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {isSubmitting ? 'Creating...' : '✨ Create Task'}
            </button>
          </form>
        </div>
      )}

      {/* Tasks List */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Tasks ({tasks.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin">
              <Clock className="text-blue-500" size={32} />
            </div>
            <p className="text-slate-400 ml-4">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-8 text-center">
            <Clock className="text-slate-500 mx-auto mb-4" size={48} />
            <p className="text-slate-400 text-lg">No tasks yet</p>
            <p className="text-slate-500 text-sm">Click "Add Schedule" to create your first task</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-slate-600 transition-colors"
              >
                {/* Task Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CheckCircle 
                      size={20} 
                      className={task.isCompleted ? 'text-green-500' : 'text-slate-500'}
                    />
                    <div>
                      <h3 className={`font-semibold ${task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                    <Clock size={14} />
                    {formatTaskTime(task)}
                    {task.isSynced === 1 && (
                      <span className="ml-2 text-green-500 text-xs">✓ Synced</span>
                    )}
                    {task.isSynced === 0 && (
                      <span className="ml-2 text-yellow-500 text-xs">⟳ Syncing...</span>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteTask(task.id, task.title)}
                  className="ml-4 p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete task"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-8 bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <p className="text-xs text-slate-500">
          Debug: {tasks.length} tasks loaded • Database ready • Timezone: {timezone}
        </p>
      </div>
    </div>
  );
}
