/**
 * FIX #2 & #5: Enhanced Notification System
 * 
 * Issues Fixed:
 * - Full-screen notification not appearing
 * - ReminderActivity not launching
 * - Screen not waking up
 * - Notification channel not creating
 * - Capacitor plugin not being called
 * 
 * FILE 1: Update src/services/scheduleService.js to properly call notifications
 * FILE 2: Update NotificationPlugin.kt with better error handling
 */

// ============================================================================
// FILE 1: src/services/scheduleService.js - UPDATED PORTION
// ============================================================================

/**
 * THIS IS THE UPDATED addSchedule FUNCTION
 * REPLACE the addSchedule function in src/services/scheduleService.js with this
 */

import { v4 as uuidv4 } from 'uuid';
import { insertTask, updateTask, deleteTask, getTasks } from './sqliteService';
import { syncTaskToMongoDB } from './syncService';
import { getNextRecurringTime, getCurrentTimezone } from '../utils/timezoneUtils';
import { speakTaskCreated } from './voiceOutputService';
import { Capacitor, registerPlugin } from '@capacitor/core';

const NotificationService = registerPlugin('NotificationService');

const DEBUG = true;

function log(message, data = null) {
  if (DEBUG) {
    console.log(`[scheduleService] ${message}`, data || '');
  }
}

function logError(message, error) {
  console.error(`[scheduleService] ${message}`, error);
}

/**
 * UPDATED: Add Schedule with notification handling
 * CRITICAL FIXES:
 * 1. Proper notification scheduling
 * 2. Better error handling
 * 3. Voice feedback
 * 4. Alarm scheduling for Android
 */
export const addSchedule = async (scheduleData) => {
  try {
    log('Creating schedule:', scheduleData);

    // 1. Generate IDs and timestamps
    const taskId = uuidv4();
    const timezone = getCurrentTimezone();
    const scheduledTimeUTC = getNextRecurringTime(scheduleData.startTime, timezone);

    log('Task details:', {
      taskId,
      timezone,
      scheduledTimeUTC,
      scheduledTime: new Date(scheduledTimeUTC).toISOString()
    });

    const taskPayload = {
      id: taskId,
      title: scheduleData.taskName,
      scheduledTimeUTC,
      description: scheduleData.description || '',
      responseText: '',
      ...scheduleData
    };

    // 2. Save to local SQLite FIRST (Critical for offline)
    log('Saving to local SQLite...');
    const localTask = await insertTask(taskPayload);
    log('✅ Task saved to SQLite:', localTask);

    // 3. Schedule native alarm notification if on Android
    if (Capacitor.isNativePlatform()) {
      log('Platform is native (Android). Scheduling notification...');
      await scheduleNotification(localTask);
    } else {
      log('Platform is web. Skipping native notification.');
    }

    // 4. Voice feedback
    try {
      log('Speaking task confirmation...');
      await speakTaskCreated(localTask.title);
    } catch (voiceError) {
      logError('Voice feedback failed (non-critical)', voiceError);
    }

    // 5. Async sync to MongoDB (non-blocking)
    syncTaskToMongoDB(localTask).catch(err => 
      logError('MongoDB sync failed (non-critical)', err)
    );

    log('✅ Schedule created successfully');
    return localTask;

  } catch (error) {
    logError('addSchedule FAILED', error);
    throw error;
  }
};

/**
 * CRITICAL FIX: Schedule notification properly
 */
const scheduleNotification = async (task) => {
  try {
    log('Scheduling notification for task:', task.id);

    // Calculate time until notification
    const now = Date.now();
    const timeUntilNotification = task.scheduledTimeUTC - now;

    log('Notification details:', {
      taskId: task.id,
      taskTitle: task.title,
      scheduledTimeUTC: task.scheduledTimeUTC,
      now: now,
      timeUntilNotificationMs: timeUntilNotification,
      timeUntilNotificationMins: Math.round(timeUntilNotification / 1000 / 60)
    });

    // Check if time is in the past
    if (timeUntilNotification < 0) {
      log('⚠️  Warning: Scheduled time is in the past!');
    }

    // Send to Capacitor plugin
    if (NotificationService && NotificationService.sendTaskReminder) {
      log('Calling NotificationService.sendTaskReminder...');
      
      const response = await NotificationService.sendTaskReminder({
        taskId: task.id,
        taskTitle: task.title,
        taskDescription: task.description || 'Time for your scheduled task',
        scheduledTimeUTC: task.scheduledTimeUTC,
        delayMs: timeUntilNotification > 0 ? timeUntilNotification : 0
      });

      log('✅ Notification scheduled successfully:', response);
      return true;

    } else {
      logError('scheduleNotification', 'NotificationService plugin not available');
      return false;
    }

  } catch (error) {
    logError('scheduleNotification FAILED', error);
    logError('Plugin details:', {
      pluginAvailable: !!NotificationService,
      pluginMethods: NotificationService ? Object.keys(NotificationService) : 'N/A'
    });
    return false;
  }
};

/**
 * Get schedules
 */
export const getSchedules = async () => {
  try {
    return await getTasks();
  } catch (error) {
    logError('getSchedules failed', error);
    return [];
  }
};

/**
 * Edit schedule
 */
export const editSchedule = async (taskId, updates) => {
  try {
    if (updates.startTime) {
      updates.scheduledTimeUTC = getNextRecurringTime(updates.startTime, getCurrentTimezone());
    }

    await updateTask(taskId, updates);

    const updatedTask = { id: taskId, ...updates };
    syncTaskToMongoDB(updatedTask).catch(err =>
      logError('MongoDB sync failed during edit', err)
    );

    return true;
  } catch (error) {
    logError('editSchedule failed', error);
    throw error;
  }
};

/**
 * Remove schedule
 */
export const removeSchedule = async (taskId) => {
  try {
    await deleteTask(taskId);
    return true;
  } catch (error) {
    logError('removeSchedule failed', error);
    throw error;
  }
};

export default {
  addSchedule,
  getSchedules,
  editSchedule,
  removeSchedule,
  scheduleNotification
};

// ============================================================================
// FILE 2: android/app/src/main/kotlin/com/dailycoach/app/NotificationPlugin.kt
// ============================================================================

/**
 * REPLACE ENTIRE NotificationPlugin.kt with this UPDATED version
 */

/*
package com.dailycoach.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.PluginMethod

@CapacitorPlugin(name = "NotificationService")
class NotificationPlugin : Plugin() {
    companion object {
        private const val TAG = "NotificationPlugin"
    }

    override fun load() {
        super.load()
        Log.d(TAG, "NotificationPlugin loaded")
        createNotificationChannels()
    }

    /**
     * Create Android 8+ Notification Channels
     * CRITICAL: Must be called before sending notifications
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Log.d(TAG, "Creating notification channels...")
            
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) 
                as android.app.NotificationManager

            // HIGH IMPORTANCE CHANNEL - For alarms (wakes screen)
            val taskReminderChannel = android.app.NotificationChannel(
                "task_reminder",
                "Task Reminders",
                android.app.NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Reminders for scheduled tasks that wake the screen"
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
                vibrationPattern = longArrayOf(500, 500, 500)
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build()
                )
            }
            notificationManager.createNotificationChannel(taskReminderChannel)
            Log.d(TAG, "✅ Task Reminder channel created")

            // LOW IMPORTANCE CHANNEL - For background service
            val serviceChannel = android.app.NotificationChannel(
                "service_channel",
                "Background Service",
                android.app.NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notifications for background service"
                enableLights(false)
                enableVibration(false)
            }
            notificationManager.createNotificationChannel(serviceChannel)
            Log.d(TAG, "✅ Service channel created")
        }
    }

    /**
     * Send task reminder with FULL SCREEN INTENT
     * CRITICAL FIX: Properly launches ReminderActivity and wakes screen
     */
    @PluginMethod
    fun sendTaskReminder(call: PluginCall) {
        try {
            Log.d(TAG, "sendTaskReminder called")
            
            val taskId = call.getString("taskId") ?: UUID.randomUUID().toString()
            val taskTitle = call.getString("taskTitle") ?: "Task Reminder"
            val taskDescription = call.getString("taskDescription") ?: ""
            val delayMs = call.getInt("delayMs", 0)

            Log.d(TAG, "Task details: id=$taskId, title=$taskTitle, delay=$delayMs ms")

            // Create notification with full screen intent
            val notification = buildTaskNotification(taskId, taskTitle, taskDescription)

            // If delay is specified, schedule with AlarmManager
            if (delayMs > 0) {
                Log.d(TAG, "Scheduling notification with ${delayMs}ms delay")
                scheduleNotificationWithDelay(taskId, notification, delayMs)
            } else {
                // Send immediately
                Log.d(TAG, "Sending notification immediately")
                NotificationManagerCompat.from(context).notify(taskId.hashCode(), notification)
            }

            Log.d(TAG, "✅ sendTaskReminder completed successfully")
            call.resolve()

        } catch (e: Exception) {
            Log.e(TAG, "sendTaskReminder FAILED", e)
            call.reject("Error sending reminder: ${e.message}", e)
        }
    }

    /**
     * Build task notification with full screen intent
     */
    private fun buildTaskNotification(
        taskId: String,
        taskTitle: String,
        taskDescription: String
    ): android.app.Notification {

        Log.d(TAG, "Building notification for task: $taskId")

        // Ensure channels exist
        createNotificationChannels()

        // Intent to open ReminderActivity (full screen)
        val fullScreenIntent = Intent(context, ReminderActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("taskId", taskId)
            putExtra("taskTitle", taskTitle)
            putExtra("taskDescription", taskDescription)
        }

        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            taskId.hashCode() + 1,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Intent to open main app
        val contentIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("taskId", taskId)
        }

        val contentPendingIntent = PendingIntent.getActivity(
            context,
            taskId.hashCode(),
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Build notification
        val builder = NotificationCompat.Builder(context, "task_reminder")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(taskTitle)
            .setContentText(taskDescription)
            .setContentIntent(contentPendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true) // CRITICAL LINE
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setVibrate(longArrayOf(500, 500, 500))

        // Add action buttons
        builder.addAction(0, "Yes", getActionPendingIntent("yes", taskId))
        builder.addAction(0, "No", getActionPendingIntent("no", taskId))
        builder.addAction(0, "Snooze 5m", getActionPendingIntent("snooze_5", taskId))

        Log.d(TAG, "✅ Notification built successfully")
        return builder.build()
    }

    /**
     * Schedule notification to appear after delay
     */
    private fun scheduleNotificationWithDelay(
        taskId: String,
        notification: android.app.Notification,
        delayMs: Int
    ) {
        Log.d(TAG, "Scheduling notification with ${delayMs}ms delay")

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        val intent = Intent(context, NotificationBroadcastReceiver::class.java).apply {
            action = "com.dailycoach.NOTIFICATION_REMINDER"
            putExtra("taskId", taskId)
            putExtra("notification", notification)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            taskId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val triggerTimeMs = SystemClock.elapsedRealtime() + delayMs

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerTimeMs,
                        pendingIntent
                    )
                    Log.d(TAG, "✅ Exact alarm scheduled")
                } else {
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerTimeMs,
                        pendingIntent
                    )
                    Log.d(TAG, "⚠️  Inexact alarm scheduled (device doesn't allow exact)")
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerTimeMs,
                    pendingIntent
                )
                Log.d(TAG, "✅ Exact alarm scheduled")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule exact alarm, using regular alarm", e)
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerTimeMs,
                pendingIntent
            )
        }
    }

    /**
     * Get action pending intent for notification buttons
     */
    private fun getActionPendingIntent(action: String, taskId: String): PendingIntent {
        val intent = Intent(context, NotificationActionReceiver::class.java).apply {
            putExtra("action", action)
            putExtra("taskId", taskId)
        }
        return PendingIntent.getBroadcast(
            context,
            (taskId + action).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * Request battery optimization exemption
     */
    @PluginMethod
    fun requestBatteryOptimizationExemption(call: PluginCall) {
        try {
            val oemIntent = BatteryOptimizationHelper.getOptimizationIntent(context)
            if (oemIntent != null) {
                try {
                    oemIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(oemIntent)
                    call.resolve(JSObject().apply { put("message", "OEM settings opened") })
                    return
                } catch (e: Exception) {
                    Log.w(TAG, "OEM intent failed, trying standard intent", e)
                }
            }

            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            call.resolve(JSObject().apply { put("message", "Battery settings opened") })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open battery settings", e)
            call.reject("Failed to open settings", e)
        }
    }
}
*/
