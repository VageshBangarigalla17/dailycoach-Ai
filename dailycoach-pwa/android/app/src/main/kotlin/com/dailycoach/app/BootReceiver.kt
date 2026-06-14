package com.dailycoach.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BootReceiver fires on BOOT_COMPLETED to re-arm the background service
 * recovery infrastructure after the device reboots.
 *
 * Registered in AndroidManifest.xml with:
 *   <receiver android:name=".BootReceiver" android:exported="true">
 *       <intent-filter>
 *           <action android:name="android.intent.action.BOOT_COMPLETED" />
 *       </intent-filter>
 *   </receiver>
 *
 * Requires: android.permission.RECEIVE_BOOT_COMPLETED
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "🔌 BOOT_COMPLETED received!")

        if (intent.action != Intent.ACTION_BOOT_COMPLETED) {
            Log.w(TAG, "⚠️ Unexpected action: ${intent.action} — ignoring")
            return
        }

        try {
            // 1. Re-arm WorkManager periodic recovery (15-min interval)
            RecoveryWorker.enqueue(context)
            Log.d(TAG, "✅ WorkManager recovery re-armed after boot")

            // 2. Schedule a fast alarm to start the service in 5 seconds
            RecoveryAlarmReceiver.schedule(context, 5_000L)
            Log.d(TAG, "✅ Initial 5-second recovery alarm scheduled after boot")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in BootReceiver.onReceive: ${e.message}")
        }
    }
}
