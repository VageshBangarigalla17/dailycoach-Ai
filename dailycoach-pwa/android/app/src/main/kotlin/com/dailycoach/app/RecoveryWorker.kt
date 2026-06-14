package com.dailycoach.app

import android.app.ActivityManager
import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class RecoveryWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    companion object {
        private const val TAG = "RecoveryWorker"
        private const val WORK_NAME = "dailycoach_recovery_worker"

        /**
         * Enqueues a unique periodic WorkManager job that runs every 15 minutes.
         * Uses KEEP policy so duplicate enqueues are ignored.
         */
        fun enqueue(context: Context) {
            Log.d(TAG, "📋 Enqueueing 15-min periodic recovery job")
            val request = PeriodicWorkRequestBuilder<RecoveryWorker>(
                15, TimeUnit.MINUTES
            )
                .addTag(WORK_NAME)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
            Log.d(TAG, "✅ WorkManager recovery scheduled")
        }

        /**
         * Checks whether DailyCoachService is currently in the running services list.
         */
        fun isServiceRunning(context: Context): Boolean {
            return try {
                val activityManager =
                    context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager

                @Suppress("DEPRECATION")
                val runningServices = activityManager.getRunningServices(Int.MAX_VALUE)
                val running = runningServices.any {
                    it.service.className == DailyCoachService::class.java.name
                }
                Log.d(TAG, if (running) "✅ DailyCoachService is running" else "❌ DailyCoachService not found")
                running
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error checking service status: ${e.message}")
                false
            }
        }
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "🔄 Recovery worker executing")
        return try {
            if (!isServiceRunning(applicationContext)) {
                Log.d(TAG, "⚠️ Service not running — restarting now")
                DailyCoachService.start(applicationContext)
            } else {
                Log.d(TAG, "✅ Service already running — no action needed")
            }
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "❌ Recovery worker failed: ${e.message}")
            Result.retry()
        }
    }
}
