package com.dailycoach.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class DailyCoachService : Service() {

    companion object {
        private const val CHANNEL_ID = "daily_coach_service_channel"
        private const val NOTIF_ID = 1001
        private const val TAG = "DailyCoachService"

        fun start(context: Context) {
            val intent = Intent(context, DailyCoachService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
                Log.d(TAG, "✅ Service start requested")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to start service: ${e.message}")
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, DailyCoachService::class.java)
            context.stopService(intent)
            Log.d(TAG, "Service stopped")
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🔧 Service onCreate()")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "▶️ Service onStartCommand()")
        try {
            startForeground(NOTIF_ID, buildNotification())
            Log.d(TAG, "✅ Service promoted to foreground")
            startBackgroundEngine()
            scheduleRecoveryWork()
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in onStartCommand: ${e.message}")
        }
        return START_STICKY
    }

    override fun onDestroy() {
        Log.d(TAG, "💀 Service onDestroy() — scheduling recovery")
        persistCheckpoint()
        scheduleRecovery()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ==================== NOTIFICATION ====================

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "DailyCoach Background",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps reminders active in the background"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
            Log.d(TAG, "Notification channel created: $CHANNEL_ID")
        }
    }

    private fun buildNotification(): android.app.Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val openAppPi = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return androidx.core.app.NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("DailyCoach AI")
            .setContentText("Background reminders active ✅")
            .setOngoing(true)
            .setContentIntent(openAppPi)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)
            .setCategory(androidx.core.app.NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    // ==================== BACKGROUND ENGINE ====================

    private fun startBackgroundEngine() {
        Log.d(TAG, "🚀 Background engine started — monitoring task schedule via WebSocket/FCM")
        // The React WebView handles the actual AI reminder logic via Firebase + Socket.IO.
        // This service's job is to keep the process alive so the WebView never gets killed.
        persistCheckpoint()
    }

    private fun persistCheckpoint() {
        Log.d(TAG, "💾 Saving service checkpoint")
        try {
            getSharedPreferences("daily_coach_prefs", Context.MODE_PRIVATE)
                .edit()
                .putLong("last_service_heartbeat", System.currentTimeMillis())
                .putBoolean("service_was_running", true)
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to persist checkpoint: ${e.message}")
        }
    }

    // ==================== RECOVERY ====================

    private fun scheduleRecovery() {
        Log.d(TAG, "⏰ Scheduling 1-minute recovery alarm")
        RecoveryAlarmReceiver.schedule(this, 60_000L)
    }

    private fun scheduleRecoveryWork() {
        Log.d(TAG, "⏰ Scheduling WorkManager 15-minute recovery")
        RecoveryWorker.enqueue(this)
    }
}
