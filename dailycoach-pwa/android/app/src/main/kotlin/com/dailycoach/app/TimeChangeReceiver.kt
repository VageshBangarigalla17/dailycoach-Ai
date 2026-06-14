package com.dailycoach.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class TimeChangeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_TIME_CHANGED -> {
                Log.d("DailyCoach", "System time was manually changed")
                rescheduleTasks(context)
            }
            Intent.ACTION_TIMEZONE_CHANGED -> {
                Log.d("DailyCoach", "System timezone changed")
                rescheduleTasks(context)
            }
        }
    }

    private fun rescheduleTasks(context: Context) {
        // Schedule a WorkManager task to:
        // 1. Read all tasks from React/SQLite (via bridge or direct)
        // 2. Recalculate UTC times based on new timezone
        // 3. Reschedule all AlarmManager alarms
        
        val rescheduleWork = OneTimeWorkRequestBuilder<RescheduleWorker>().build()
        
        WorkManager.getInstance(context).enqueueUniqueWork(
            "reschedule_on_time_change",
            ExistingWorkPolicy.REPLACE,
            rescheduleWork
        )
    }
}
