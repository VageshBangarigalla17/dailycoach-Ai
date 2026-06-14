# DailyCoach AI: Applying "The Architect's Blueprint" Principles

## 🎯 OVERVIEW: Architect's Blueprint → DailyCoach Implementation

The document "The Architect's Blueprint" provides 188 references covering production-grade Android alarm app architecture. While it's written for a simple alarm app, **all principles directly apply to DailyCoach's reminder/task scheduling system.**

This document maps each key principle to DailyCoach's context.

---

## 📐 ARCHITECTURE LAYER COMPARISON

### **Architect's Blueprint: MVVM Native Architecture**

```
┌─────────────────────┐
│  UI (Jetpack)       │ ← Native Android Compose
└─────────┬───────────┘
          │
┌─────────────────────┐
│  ViewModel          │ ← Orchestrates logic
└─────────┬───────────┘
          │
┌─────────────────────┐
│  Repository         │ ← Room Database (local source of truth)
└─────────┬───────────┘
          │
┌─────────────────────┐
│  Background (work)  │ ← WorkManager + AlarmManager (hybrid)
└─────────────────────┘
```

### **DailyCoach: React PWA + Capacitor Adaptation**

```
┌─────────────────────┐
│  UI (React/Vite)    │ ← Web UI
└─────────┬───────────┘
          │
┌─────────────────────┐
│  Redux/Context      │ ← State management
└─────────┬───────────┘
          │
┌─────────────────────┐
│  Services Layer     │ ← Business logic
└─────────┬───────────┘
          │
┌─────────────────────┐
│  expo-sqlite (NEW)  │ ← Local SQLite (was missing!)
│  + MongoDB          │ ← Cloud sync
└─────────┬───────────┘
          │
┌─────────────────────┐
│  Capacitor Plugin   │ ← Android native bridge
│  (Kotlin services)  │
└─────────┬───────────┘
          │
┌─────────────────────┐
│  Android OS         │ ← WorkManager + AlarmManager
└─────────────────────┘
```

**Key Difference:**
- ✅ Blueprint has Room DB as **single source of truth**
- ❌ DailyCoach has MongoDB as source of truth (unreliable if offline)
- 🔧 FIX: Make **expo-sqlite** the primary, MongoDB the secondary sync target

---

## 🔑 CRITICAL PRINCIPLES FROM BLUEPRINT → DAILYCOACH

### **Principle 1: Hybrid Scheduling Strategy (p. 2)**

**Blueprint says:**
> "Avoid using AlarmManager.setRepeating(). Instead, use AlarmManager for single-shot alarms only. After an alarm fires, recalculate the next trigger time and schedule a new single-shot alarm."

**DailyCoach current state:** ✅ Already implemented (good!)

**DailyCoach's `DailyCoachService.kt`:**
```kotlin
// Current implementation already does this:
// 1. Primary: AlarmManager.setExactAndAllowWhileIdle() for main alarm
// 2. Fallback 1: WorkManager PeriodicWorker (15 min recovery)
// 3. Fallback 2: AlarmManager repeating every 60 sec (self-rescheduling)

// ✅ This is correct per Blueprint!
```

---

### **Principle 2: Local Data Persistence (p. 4)**

**Blueprint says (p. 4):**
> "The Room persistence library provides an abstraction layer over SQLite, simplifying database operations and preventing common errors. Paired with the MVVM architecture, Coroutines, and Kotlin Flow, Room forms a powerful combination for managing alarm state."

**Blueprint's reasoning:**
- Users expect alarms to survive app restart
- Alarms must function across device reboots
- Cannot rely solely on remote database

**DailyCoach current state:** ❌ MISSING (critical gap!)

**DailyCoach's problem:**
```javascript
// CURRENT (unreliable):
const createTask = async (task) => {
  // Try to reach MongoDB
  const response = await fetch('http://localhost:5000/api/tasks', { ... });
  // If MongoDB unreachable → task is lost!
  // App cannot schedule reminders
};

// FIXED (reliable):
const createTask = async (task) => {
  // 1. Save to LOCAL SQLite immediately
  await db.run('INSERT INTO tasks (...)', task);
  
  // 2. Try to sync to MongoDB (async, non-blocking)
  syncToMongoDB(task).catch(error => {
    console.log('Sync failed, but task is safe in SQLite');
  });
  
  // 3. Schedule reminder using local data
  await scheduleTaskReminder(task);
};
```

**Implementation for DailyCoach:**
```javascript
// src/services/TaskPersistenceService.js (NEW FILE)
import * as SQLite from 'expo-sqlite';

class TaskPersistenceService {
  async createTask(task) {
    // PRIMARY: Local SQLite (always works)
    const localTask = {
      id: uuid(),
      title: task.title,
      scheduledTimeUTC: this.localTimeToUTC(task.scheduledTime),
      description: task.description,
      isSynced: false,
      createdAt: Date.now()
    };
    
    await this.db.runAsync(
      'INSERT INTO tasks (id, title, scheduledTimeUTC, isSynced) VALUES (?, ?, ?, ?)',
      [localTask.id, localTask.title, localTask.scheduledTimeUTC, false]
    );

    // SECONDARY: MongoDB sync (happens in background)
    this.syncToMongoDBAsync(localTask);
    
    return localTask;
  }

  async syncToMongoDBAsync(task) {
    try {
      const response = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(task)
      });
      
      // Mark as synced
      await this.db.runAsync(
        'UPDATE tasks SET isSynced = 1 WHERE id = ?',
        [task.id]
      );
    } catch (error) {
      console.warn('MongoDB sync failed, task remains in local SQLite:', error);
      // Will retry on next sync cycle (every 60 seconds)
    }
  }
}
```

---

### **Principle 3: UTC-Based Time Storage (p. 6)**

**Blueprint says (p. 6):**
> "Store all absolute time points in UTC. When a user sets an alarm for 7:00 AM their local time, convert this local time to its corresponding UTC timestamp before saving it to the database."

**Blueprint's reasoning:**
- Local time is ambiguous (DST transitions, timezone changes)
- UTC is unambiguous and absolute
- Displaying time: convert UTC back to user's timezone

**DailyCoach current state:** ❌ NOT CONFIRMED (likely storing local time)

**Example of the problem:**
```
Scenario: User in New York sets reminder for 7:00 AM
Before DST: 7:00 AM EST = 12:00 UTC
DailyCoach currently stores: 7:00 AM (local, ambiguous!)

Day of reminder arrives with DST (EDT time):
7:00 AM EDT = 11:00 UTC (1 hour earlier!)
Reminder fires at: 12:00 UTC = 8:00 AM EDT (WRONG TIME!)

With UTC storage:
Store: 12:00 UTC (unambiguous)
Doesn't matter if timezone changes → always fires at same UTC time
```

**DailyCoach fix:**

```javascript
// src/utils/timezoneUtils.js (NEW FILE)
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

export class TimezoneService {
  
  // User creates reminder at 7:00 AM in their timezone
  localToUTC(localTimeString, userTimezone) {
    // localTimeString: "2026-06-10T07:00"
    // userTimezone: "America/New_York"
    
    const zonedDate = zonedTimeToUtc(localTimeString, userTimezone);
    return zonedDate.getTime(); // Milliseconds since epoch (UTC)
  }

  // Display the UTC time back in user's timezone
  utcToLocal(utcTimestamp, userTimezone) {
    const utcDate = new Date(utcTimestamp);
    const localDate = utcToZonedTime(utcDate, userTimezone);
    return format(localDate, 'HH:mm dd/MM');
  }

  // When creating a task reminder
  async createTaskWithUTC(task) {
    const userTimezone = await this.getUserTimezone();
    
    return {
      ...task,
      scheduledTimeUTC: this.localToUTC(task.scheduledTime, userTimezone),
      // Display: convert back to local for UI
      displayTime: this.utcToLocal(this.localToUTC(task.scheduledTime, userTimezone), userTimezone)
    };
  }
}
```

**Update SQLite schema:**
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  -- ✅ Store as UTC (absolute, unambiguous)
  scheduledTimeUTC INTEGER NOT NULL,
  -- For display only (converted from UTC)
  displayTimeLocal TEXT,
  description TEXT,
  isSynced BOOLEAN DEFAULT 0,
  createdAt INTEGER
);
```

---

### **Principle 4: System Time Change Handling (p. 6-7)**

**Blueprint says (p. 6-7):**
> "The application must register a BroadcastReceiver in the manifest to listen for Intent.ACTION_TIME_SET and Intent.ACTION_TIMEZONE_CHANGED. Upon receiving either of these broadcasts, the application's receiver should query the database for all enabled alarms. For each alarm, it should recalculate its next trigger time based on the new system timezone and reschedule the alarm accordingly."

**DailyCoach current state:** ❌ MISSING!

**The problem this solves:**
```
User sets reminder for 7:00 AM
Next day arrives...
User manually changes device timezone
Old reminder was stored for 7:00 AM EST (now wrong!)
New reminder should reschedule to maintain 7:00 AM in NEW timezone

Without this receiver: Reminder fires at wrong time
With this receiver: Automatically reschedules when timezone changes
```

**DailyCoach implementation:**

```kotlin
// android/app/src/main/kotlin/com/dailycoach/TimeChangeReceiver.kt (NEW FILE)
package com.dailycoach.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.*

class TimeChangeReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_TIME_SET -> {
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
    // 1. Read all tasks from React/SQLite
    // 2. Recalculate UTC times based on new timezone
    // 3. Reschedule all AlarmManager alarms
    
    val reschedulework = OneTimeWorkRequestBuilder<RescheduleTasksWorker>()
      .build()
    
    WorkManager.getInstance(context).enqueueUniqueWork(
      "reschedule_on_time_change",
      ExistingWorkPolicy.REPLACE,
      reschedulework
    )
  }
}

// android/app/src/main/kotlin/com/dailycoach/RescheduleTasksWorker.kt (NEW FILE)
class RescheduleTasksWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
  override suspend fun doWork(): Result {
    return try {
      // Call React bridge to retrieve all active tasks
      val plugin = NotificationPlugin.getInstance()
      val tasks = plugin.getAllActiveTasks() // Returns list from SQLite
      
      // Reschedule each task
      for (task in tasks) {
        plugin.scheduleTaskReminder(task)
      }
      
      Log.i("DailyCoach", "Rescheduled ${tasks.size} tasks after time/timezone change")
      Result.success()
    } catch (e: Exception) {
      Log.e("DailyCoach", "Error rescheduling tasks", e)
      Result.retry() // Retry later if failed
    }
  }
}
```

**Update AndroidManifest.xml:**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

  <receiver 
    android:name=".TimeChangeReceiver"
    android:exported="false">
    <intent-filter>
      <action android:name="android.intent.action.TIME_SET" />
      <action android:name="android.intent.action.TIMEZONE_CHANGED" />
    </intent-filter>
  </receiver>

</manifest>
```

---

### **Principle 5: Notification Channels & Full-Screen Intent (p. 8-9)**

**Blueprint says (p. 8-9):**
> "Notifications must be assigned to a Notification Channel. An alarm app should create at least two channels: one for the main alarm alert (high importance, with full-screen intent) and another for less urgent reminders."

**DailyCoach current state:** ❌ MISSING

**What's wrong with DailyCoach's current notifications:**
```javascript
// CURRENT (unreliable):
// Shows React modal that user can swipe away
const showTaskReminder = (task) => {
  return (
    <Modal isOpen={true}>
      <h1>{task.title}</h1>
      <button>Yes</button>
      <button>No</button>
      {/* User can easily swipe away without responding */}
    </Modal>
  );
};

// PROBLEM: User swipes away → no response recorded → task marked "no-response"
```

**Blueprint's solution: Full-Screen Intent (p. 8-9)**
> "This type of notification takes over the entire screen, forcing the user to interact with it to acknowledge the alarm."

**DailyCoach fix:**

```kotlin
// android/app/src/main/kotlin/com/dailycoach/NotificationPlugin.kt
// ADD: Notification channels (for Android 8+)

private fun createNotificationChannels() {
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    val taskReminderChannel = NotificationChannel(
      CHANNEL_TASK_REMINDER,
      "Task Reminders",
      NotificationManager.IMPORTANCE_HIGH // ← HIGH importance = can use full-screen intent
    ).apply {
      description = "Important task reminders"
      setShowBadge(true)
      enableVibration(true)
      enableLights(true)
      lightColor = 0xFF0088CC.toInt()
    }
    
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) 
      as NotificationManager
    notificationManager.createNotificationChannel(taskReminderChannel)
  }
}

// ADD: Full-screen intent
private fun sendTaskReminderWithFullScreen(task: Task) {
  val fullScreenIntent = Intent(context, ReminderActivity::class.java).apply {
    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    putExtra("taskId", task.id)
    putExtra("taskTitle", task.title)
  }

  val fullScreenPendingIntent = PendingIntent.getActivity(
    context,
    task.id.hashCode(),
    fullScreenIntent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )

  val notification = NotificationCompat.Builder(context, CHANNEL_TASK_REMINDER)
    .setSmallIcon(android.R.drawable.ic_dialog_info)
    .setContentTitle(task.title)
    .setContentText(task.description)
    .setFullScreenIntent(fullScreenPendingIntent, true) // ← THE KEY LINE
    .setAutoCancel(true)
    .setPriority(NotificationCompat.PRIORITY_HIGH)
    .addAction(0, "Yes", getPendingIntent(context, "yes", task.id))
    .addAction(0, "No", getPendingIntent(context, "no", task.id))
    .build()

  NotificationManagerCompat.from(context).notify(task.id.hashCode(), notification)
}
```

**Update AndroidManifest.xml:**
```xml
<!-- Required for full-screen intent on Android 14+ -->
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />

<!-- Existing activity with showWhenLocked flag -->
<activity
  android:name=".ReminderActivity"
  android:exported="true"
  android:theme="@style/Theme.AppCompat.NoActionBar"
  android:showWhenLocked="true"
  android:turnScreenOn="true"
/>
```

---

### **Principle 6: Battery Optimization & OEM Compliance (p. 10-11)**

**Blueprint says (p. 10-11):**
> "The most effective strategy is not to fight the system but to guide the user to exempt the app from battery optimization. Instead, the app should detect when it is in a restrictive bucket and present the user with a direct link to the relevant system settings page."

**Blueprint identifies specific OEM problems:**
- **Xiaomi MIUI:** Actively kills background apps
- **Huawei EMUI:** Aggressive battery manager
- **Samsung One UI:** Restrictive "Battery and device care"

**DailyCoach current state:** ❌ NO OEM GUIDANCE

**The problem:**
```
User's Xiaomi phone:
- DailyCoach service starts
- But system aggressively limits background activity
- After 15 minutes idle → service is killed
- Reminders don't fire
- User gives 1-star review: "App doesn't work"

User has NO IDEA they need to enable battery optimization exemption
```

**DailyCoach fix:**

```kotlin
// android/app/src/main/kotlin/com/dailycoach/BatteryOptimizationHelper.kt
class BatteryOptimizationHelper(private val context: Context) {

  fun detectAndShowGuidance() {
    val manufacturer = Build.MANUFACTURER.lowercase()
    
    when {
      manufacturer.contains("xiaomi") -> showXiaomiGuidance()
      manufacturer.contains("huawei") -> showHuaweiGuidance()
      manufacturer.contains("samsung") -> showSamsungGuidance()
    }
  }

  private fun showXiaomiGuidance() {
    // Show in-app settings page with:
    "For reliable reminders on Xiaomi:
    1. Settings > Battery & Performance > App Battery Saver
    2. Select DailyCoach > 'No restrictions'
    3. Settings > Permissions > Autostart > DailyCoach > Enable"
    
    // Add button to open settings
    addButton("Open Settings") { openXiaomiSettings() }
  }

  private fun showHuaweiGuidance() {
    "For reliable reminders on Huawei:
    1. Settings > Apps > DailyCoach > Battery > 'No restrictions'
    2. Settings > Battery Manager > Protected Apps > Add DailyCoach
    3. Settings > Apps > DailyCoach > Permissions > Auto-start > Enable"
    
    addButton("Open Settings") { openHuaweiSettings() }
  }

  private fun showSamsungGuidance() {
    "For reliable reminders on Samsung:
    1. Settings > Battery and device care > Battery
    2. Background usage limits > DailyCoach > Never sleeping apps"
    
    addButton("Open Settings") { openSamsungSettings() }
  }
}
```

**Add to React Settings page:**

```javascript
// src/features/settings/BatteryOptimizationSection.jsx
import { useState, useEffect } from 'react';

export function BatteryOptimizationSection() {
  const [manufacturer, setManufacturer] = useState('');
  const [showGuidance, setShowGuidance] = useState(false);

  useEffect(() => {
    detectDeviceManufacturer();
  }, []);

  const detectDeviceManufacturer = async () => {
    const mfr = await BatteryOptimizationHelper.getManufacturer();
    setManufacturer(mfr);
    
    if (['xiaomi', 'huawei', 'samsung'].includes(mfr.toLowerCase())) {
      setShowGuidance(true);
    }
  };

  const handleOpenSettings = async () => {
    await BatteryOptimizationHelper.detectAndShowGuidance();
  };

  if (!showGuidance) {
    return <div>✅ Battery optimization is not restricting DailyCoach</div>;
  }

  return (
    <div className="warning-card">
      <h3>⚠️ Battery Optimization on {manufacturer}</h3>
      <p>Your device may restrict DailyCoach's background activity.</p>
      <button onClick={handleOpenSettings}>
        Enable Reliable Reminders
      </button>
    </div>
  );
}
```

---

## 📊 SUMMARY TABLE: Blueprint Principles → DailyCoach Implementation

| Principle | Blueprint Page | Status | DailyCoach Fix |
|-----------|---|--------|---|
| **Hybrid Scheduling** | p. 2-3 | ✅ Already implemented | None needed |
| **Local Persistence (Room DB)** | p. 4-5 | ❌ Missing | Add expo-sqlite |
| **UTC Time Storage** | p. 6 | ❌ Likely using local time | Implement timezoneUtils.js |
| **Time/Timezone Change Handling** | p. 6-7 | ❌ Missing receivers | Add TimeChangeReceiver.kt |
| **Notification Channels** | p. 8 | ❌ Basic modals only | Implement NotificationChannels |
| **Full-Screen Intent** | p. 8-9 | ❌ Modal dismissible | Add full-screen intent + ReminderActivity |
| **Boot Completion** | p. 4 | ✅ Already implemented | None needed |
| **Foreground Service** | p. 3 | ✅ Already implemented | None needed |
| **Permissions (SCHEDULE_EXACT_ALARM)** | p. 10 | ✅ Already implemented | None needed |
| **Battery Optimization Guidance** | p. 10-11 | ❌ Missing | Add BatteryOptimizationHelper |
| **OEM-Specific Workarounds** | p. 10-11 | ❌ Missing | Add Xiaomi/Huawei/Samsung guidance |
| **Testing Strategy** | p. 13-15 | ❌ No tests | Add unit + integration tests |

---

## 🎯 IMPLEMENTATION ROADMAP (6 Weeks)

Using Blueprint principles as guide:

**Week 1-2: Critical Foundation**
- Implement local SQLite (Blueprint p. 4-5)
- Implement UTC time storage (Blueprint p. 6)

**Week 2-3: Reliability**
- Implement time change receivers (Blueprint p. 6-7)
- Implement notification channels + full-screen intent (Blueprint p. 8-9)

**Week 4: Device Compatibility**
- Implement battery optimization guidance (Blueprint p. 10-11)
- OEM-specific workarounds

**Week 5-6: Quality**
- Testing strategy (Blueprint p. 13-15)
- Google Play submission

---

## ✅ SUCCESS CRITERIA (Post-Implementation)

After applying all Blueprint principles to DailyCoach:

| Criterion | Blueprint Standard | DailyCoach Target |
|-----------|---|---|
| Offline reliability | Works without network | ✅ Local SQLite works offline |
| Time accuracy | DST-aware | ✅ UTC storage + receivers |
| Notification delivery | 95%+ delivery rate | ✅ Full-screen intent |
| Battery efficiency | No aggressive background drain | ✅ OEM-compliant guidance |
| Cross-device compatibility | Works on all OEMs | ✅ Xiaomi/Huawei/Samsung tested |
| Production readiness | Google Play approved | ✅ Ready for store submission |

