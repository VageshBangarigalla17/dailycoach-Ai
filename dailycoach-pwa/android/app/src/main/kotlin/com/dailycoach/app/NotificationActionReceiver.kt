package com.dailycoach.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationManagerCompat

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.getStringExtra("action") ?: return
        val taskId = intent.getStringExtra("taskId") ?: return

        when (action) {
            "yes" -> {
                Log.d("DailyCoach", "User responded YES to task: $taskId")
                // TODO: Bridge this back to React or SQLite to update task completion
            }
            "no" -> {
                Log.d("DailyCoach", "User responded NO to task: $taskId")
            }
            "snooze_5" -> {
                Log.d("DailyCoach", "Snooze 5 minutes: $taskId")
            }
        }

        // Dismiss notification
        NotificationManagerCompat.from(context).cancel(taskId.hashCode())
    }
}
