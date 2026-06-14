package com.dailycoach.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class RecoveryAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "RecoveryAlarmReceiver"

        /**
         * Schedules a one-shot exact alarm to fire [delayMillis] ms from now.
         * On Android 12+ checks for exact alarm permission, falls back to inexact if unavailable.
         * When the alarm fires, onReceive() restarts DailyCoachService and reschedules itself.
         */
        fun schedule(context: Context, delayMillis: Long) {
            Log.d(TAG, "⏰ Scheduling recovery alarm in ${delayMillis}ms")
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, RecoveryAlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context, 0, intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            val triggerAt = System.currentTimeMillis() + delayMillis

            try {
                when {
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
                        // Android 12+ — requires SCHEDULE_EXACT_ALARM permission
                        if (alarmManager.canScheduleExactAlarms()) {
                            alarmManager.setExactAndAllowWhileIdle(
                                AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent
                            )
                            Log.d(TAG, "✅ Exact alarm scheduled (Android 12+)")
                        } else {
                            // Fallback: inexact alarm — still better than nothing
                            alarmManager.setAndAllowWhileIdle(
                                AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent
                            )
                            Log.w(TAG, "⚠️ Inexact alarm scheduled — SCHEDULE_EXACT_ALARM not granted")
                        }
                    }
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> {
                        alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent
                        )
                        Log.d(TAG, "✅ Exact alarm scheduled (Android 6–11)")
                    }
                    else -> {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                        Log.d(TAG, "✅ Exact alarm scheduled (pre-Android 6)")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to schedule alarm: ${e.message}")
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "🔔 Recovery alarm fired!")
        try {
            // Restart service if killed by OS
            DailyCoachService.start(context)
            Log.d(TAG, "✅ DailyCoachService restart requested")

            // Reschedule alarm to keep the loop alive
            schedule(context, 60_000L) // 1 minute
            Log.d(TAG, "✅ Next recovery alarm scheduled")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in onReceive: ${e.message}")
        }
    }
}
