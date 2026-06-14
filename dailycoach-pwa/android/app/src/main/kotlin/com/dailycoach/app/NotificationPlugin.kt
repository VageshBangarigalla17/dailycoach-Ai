package com.dailycoach.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.PluginMethod

/**
 * NotificationPlugin bridges the React WebView to the native Android background service.
 *
 * Registered automatically by Capacitor when the plugin is added to MainActivity.
 * Plugin name "NotificationService" must match the registerPlugin() call in React:
 *   const NotificationService = registerPlugin('NotificationService');
 */
@CapacitorPlugin(name = "NotificationService")
class NotificationPlugin : Plugin() {

    companion object {
        private const val TAG = "NotificationPlugin"
    }

    /**
     * Start the foreground background service.
     * Called from React: await NotificationService.startBackgroundService()
     */
    @PluginMethod
    fun startBackgroundService(call: PluginCall) {
        Log.d(TAG, "📱 startBackgroundService() called from React")
        return try {
            DailyCoachService.start(context)
            val result = JSObject().apply {
                put("success", true)
                put("message", "DailyCoach background service started")
            }
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "❌ startBackgroundService error: ${e.message}")
            call.reject("Failed to start background service: ${e.message}", e)
        }
    }

    /**
     * Stop the foreground background service.
     * Called from React: await NotificationService.stopBackgroundService()
     */
    @PluginMethod
    fun stopBackgroundService(call: PluginCall) {
        Log.d(TAG, "🛑 stopBackgroundService() called from React")
        return try {
            DailyCoachService.stop(context)
            val result = JSObject().apply {
                put("success", true)
                put("message", "DailyCoach background service stopped")
            }
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "❌ stopBackgroundService error: ${e.message}")
            call.reject("Failed to stop background service: ${e.message}", e)
        }
    }

    /**
     * Check if the background service is currently running.
     * Called from React: const { running } = await NotificationService.isServiceRunning()
     */
    @PluginMethod
    fun isServiceRunning(call: PluginCall) {
        Log.d(TAG, "🔍 isServiceRunning() called from React")
        return try {
            val running = RecoveryWorker.isServiceRunning(context)
            val result = JSObject().apply {
                put("running", running)
            }
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "❌ isServiceRunning error: ${e.message}")
            call.reject("Failed to check service status: ${e.message}", e)
        }
    }

    /**
     * Open Android battery optimization settings for this app.
     * Called from React: await NotificationService.requestBatteryOptimizationExemption()
     */
    @PluginMethod
    fun requestBatteryOptimizationExemption(call: PluginCall) {
        Log.d(TAG, "🔋 requestBatteryOptimizationExemption() called from React")
        return try {
            // First try OEM-specific intent
            val oemIntent = BatteryOptimizationHelper.getOptimizationIntent(context)
            if (oemIntent != null) {
                try {
                    oemIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(oemIntent)
                    call.resolve(JSObject().apply { put("requested", true); put("message", "Opened device-specific background settings") })
                    return
                } catch (e: Exception) {
                    Log.w(TAG, "OEM specific intent failed, falling back to standard intent")
                }
            }

            // Standard intent
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            val result = JSObject().apply {
                put("requested", true)
                put("message", "Battery optimization settings opened")
            }
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "❌ requestBatteryOptimizationExemption error: ${e.message}")
            // Fallback: open generic battery settings
            try {
                val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(fallbackIntent)
                val result = JSObject().apply {
                    put("requested", true)
                    put("message", "Battery settings opened (fallback)")
                }
                call.resolve(result)
            } catch (fallbackEx: Exception) {
                call.reject("Failed to open battery settings: ${fallbackEx.message}", fallbackEx)
            }
        }
    }

    /**
     * Creates the notification channels required for Android 8+
     */
    private fun createNotificationChannels() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

            // Channel 1: Task Reminder (HIGH importance - full-screen intent)
            val taskReminderChannel = android.app.NotificationChannel(
                "task_reminder",
                "Task Reminders",
                android.app.NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Reminders for your scheduled tasks"
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
                lightColor = 0xFF0088CC.toInt()
                vibrationPattern = longArrayOf(500, 500, 500)
            }
            notificationManager.createNotificationChannel(taskReminderChannel)

            // Channel 2: Background Service (LOW importance)
            val serviceChannel = android.app.NotificationChannel(
                "background_service",
                "Background Service",
                android.app.NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background service notification"
                enableLights(false)
                enableVibration(false)
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(serviceChannel)
        }
    }

    /**
     * Send a high-priority task reminder with full-screen intent
     */
    @PluginMethod
    fun sendTaskReminder(call: PluginCall) {
        try {
            createNotificationChannels() // Ensure channels exist
            val taskId = call.getString("taskId") ?: ""
            val taskTitle = call.getString("taskTitle") ?: "Task Reminder"
            val taskDescription = call.getString("taskDescription") ?: ""

            // Intent to launch app when notification is tapped
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra("taskId", taskId)
            }

            val pendingIntent = android.app.PendingIntent.getActivity(
                context,
                taskId.hashCode(),
                intent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
            )

            // Full-screen intent (Android 14+, requires permission)
            val fullScreenIntent = Intent(context, ReminderActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("taskId", taskId)
                putExtra("taskTitle", taskTitle)
            }

            val fullScreenPendingIntent = android.app.PendingIntent.getActivity(
                context,
                taskId.hashCode() + 1,
                fullScreenIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
            )

            // Build notification with full-screen intent
            val builder = androidx.core.app.NotificationCompat.Builder(context, "task_reminder")
                .setSmallIcon(android.R.drawable.ic_dialog_info) // TODO: replace with proper app icon
                .setContentTitle(taskTitle)
                .setContentText(taskDescription)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true) // ← CRITICAL for locking screen wakeup
                .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC)
                .setLights(0xFF0088CC.toInt(), 500, 500)
                .setVibrate(longArrayOf(500, 500, 500))

            // Add action buttons
            builder.addAction(0, "Yes", getActionPendingIntent("yes", taskId))
            builder.addAction(0, "No", getActionPendingIntent("no", taskId))
            builder.addAction(0, "Snooze 5min", getActionPendingIntent("snooze_5", taskId))

            androidx.core.app.NotificationManagerCompat.from(context).notify(taskId.hashCode(), builder.build())
            call.resolve()
        } catch (e: Exception) {
            call.reject("Error sending notification: ${e.message}")
        }
    }

    private fun getActionPendingIntent(action: String, taskId: String): android.app.PendingIntent {
        val intent = Intent(context, NotificationActionReceiver::class.java).apply {
            putExtra("action", action)
            putExtra("taskId", taskId)
        }
        return android.app.PendingIntent.getBroadcast(
            context,
            (taskId + action).hashCode(),
            intent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )
    }
}
