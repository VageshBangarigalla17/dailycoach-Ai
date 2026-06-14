package com.dailycoach.app

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class ReminderActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Ensure screen turns on and bypasses keyguard for high-priority alarms
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        // Extremely simple layout for the Full Screen Intent
        // In a real implementation, you might inflate an XML layout here
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setBackgroundColor(android.graphics.Color.parseColor("#1E293B")) // Night theme
        }

        val taskId = intent.getStringExtra("taskId") ?: ""
        val taskTitle = intent.getStringExtra("taskTitle") ?: "Task Reminder"

        val titleView = TextView(this).apply {
            text = taskTitle
            textSize = 32f
            setTextColor(android.graphics.Color.WHITE)
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 100)
        }
        layout.addView(titleView)

        val btnYes = Button(this).apply {
            text = "YES, I DID IT"
            setBackgroundColor(android.graphics.Color.parseColor("#22C55E")) // Green
            setTextColor(android.graphics.Color.WHITE)
            setOnClickListener {
                // Send action to receiver and finish
                val actionIntent = android.content.Intent(this@ReminderActivity, NotificationActionReceiver::class.java).apply {
                    putExtra("action", "yes")
                    putExtra("taskId", taskId)
                }
                sendBroadcast(actionIntent)
                finish()
            }
        }
        layout.addView(btnYes)

        val btnNo = Button(this).apply {
            text = "NO, MISSED IT"
            setBackgroundColor(android.graphics.Color.parseColor("#EF4444")) // Red
            setTextColor(android.graphics.Color.WHITE)
            setOnClickListener {
                val actionIntent = android.content.Intent(this@ReminderActivity, NotificationActionReceiver::class.java).apply {
                    putExtra("action", "no")
                    putExtra("taskId", taskId)
                }
                sendBroadcast(actionIntent)
                finish()
            }
        }
        layout.addView(btnNo)

        val btnSnooze = Button(this).apply {
            text = "SNOOZE 5 MIN"
            setBackgroundColor(android.graphics.Color.parseColor("#EAB308")) // Yellow
            setTextColor(android.graphics.Color.BLACK)
            setOnClickListener {
                val actionIntent = android.content.Intent(this@ReminderActivity, NotificationActionReceiver::class.java).apply {
                    putExtra("action", "snooze_5")
                    putExtra("taskId", taskId)
                }
                sendBroadcast(actionIntent)
                finish()
            }
        }
        layout.addView(btnSnooze)

        setContentView(layout)
    }
}
