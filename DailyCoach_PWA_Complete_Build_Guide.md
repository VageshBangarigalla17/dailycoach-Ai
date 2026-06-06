# 🚀 DailyCoach AI — Complete PWA Build Guide
## From Zero to Working App Using Antigravity + Cursor + VS Code Copilot

---

## WHY PWA IS THE PERFECT CHOICE FOR YOUR APP

| Feature | PWA | Android App (React Native) |
|---|---|---|
| Install on Android home screen | ✅ Yes | ✅ Yes |
| Push notifications | ✅ Yes | ✅ Yes |
| Voice TTS + STT | ✅ Chrome supports fully | ⚠️ Complex setup |
| Background reminders | ✅ Service Worker | ✅ But harder |
| Build time | ✅ 1-2 weeks | ❌ 4-6 weeks |
| One codebase | ✅ Web + Android | ❌ Separate code |
| No app store needed | ✅ Install from browser | ❌ Need Play Store |
| Works on desktop too | ✅ Yes | ❌ No |

**Verdict: PWA gives you 90% of native Android experience with 30% of the effort.**

---

## 🧰 TOOL ROLES IN THIS PROJECT

| Tool | When to Use | What For |
|---|---|---|
| **Antigravity 2.0** | Big builds, new features | Generate full files, multi-agent parallel building |
| **Cursor** | Fixing bugs, precision edits | Targeted changes, debugging specific files |
| **VS Code Copilot** | While typing code | Autocomplete, quick suggestions, small fixes |

---

## 🏗️ FINAL APP ARCHITECTURE

```
DailyCoach AI PWA
│
├── FRONTEND (React + Vite + PWA)
│   ├── Login / Register page
│   ├── Dashboard (today's timeline)
│   ├── Schedule Builder (add/edit reminders)
│   ├── Reports (weekly/monthly tracking)
│   ├── Settings (user name, voice preference)
│   └── Service Worker (offline + notifications)
│
├── BACKEND (Firebase — No separate server needed!)
│   ├── Firebase Auth (login/register)
│   ├── Firestore (schedules, task logs, user data)
│   ├── Cloud Functions (scheduled triggers every minute)
│   └── Cloud Messaging (push notifications)
│
├── AI LAYER (Gemini API)
│   └── Generates personalized voice messages
│
└── VOICE LAYER (Browser APIs)
    ├── Web Speech API — SpeechSynthesis (app speaks)
    └── Web Speech API — SpeechRecognition (app listens)
```

**Key Decision: No separate Node.js server.**
Firebase Cloud Functions replace node-cron. This means:
- No server to pay for
- No server to go down
- Scales automatically
- Free tier is generous enough for personal use

---

## 📦 COMPLETE FOLDER STRUCTURE

```
dailycoach-pwa/
├── public/
│   ├── manifest.json          ← PWA install config
│   ├── icon-192.png           ← App icon (Android)
│   ├── icon-512.png           ← App icon (splash)
│   └── firebase-messaging-sw.js ← Push notification handler
│
├── src/
│   ├── main.jsx               ← App entry point
│   ├── App.jsx                ← Routing + auth guard
│   │
│   ├── config/
│   │   ├── firebase.js        ← Firebase initialization
│   │   └── gemini.js          ← Gemini API setup
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx    ← User login state
│   │   └── ScheduleContext.jsx← Schedule state
│   │
│   ├── services/
│   │   ├── voiceService.js    ← TTS + STT (speak & listen)
│   │   ├── geminiService.js   ← AI message generation
│   │   ├── notificationService.js ← Push notification setup
│   │   └── scheduleService.js ← Schedule CRUD operations
│   │
│   ├── pages/
│   │   ├── Login.jsx          ← Auth page
│   │   ├── Dashboard.jsx      ← Today's view + live reminders
│   │   ├── ScheduleBuilder.jsx← Create/edit user schedule
│   │   ├── Reports.jsx        ← History + streaks
│   │   └── Settings.jsx       ← User preferences
│   │
│   ├── components/
│   │   ├── ReminderModal.jsx  ← Voice conversation popup
│   │   ├── TaskCard.jsx       ← Individual task display
│   │   ├── Timeline.jsx       ← Day view timeline
│   │   ├── HeatMap.jsx        ← Completion history grid
│   │   └── Navbar.jsx         ← Navigation bar
│   │
│   └── hooks/
│       ├── useVoice.js        ← Voice hook
│       └── useSchedule.js     ← Schedule hook
│
├── functions/                  ← Firebase Cloud Functions
│   ├── package.json
│   └── index.js               ← Scheduled reminder trigger
│
├── package.json
├── vite.config.js             ← PWA plugin config
├── tailwind.config.js
├── .env                       ← API keys (never commit)
└── firebase.json              ← Firebase config
```

---

## ⚙️ SETUP — BEFORE ANY PROMPTS (Do This First)

### Step 1: Create Accounts (All Free)
```
1. Google account (for Firebase + Gemini)
2. Firebase Console → console.firebase.google.com → New Project
3. Google AI Studio → aistudio.google.com → Get Gemini API Key
4. Vercel account → vercel.com (for deployment)
```

### Step 2: Firebase Setup
```
In Firebase Console:
✓ Enable Authentication → Email/Password
✓ Enable Firestore Database → Start in test mode
✓ Enable Cloud Messaging (for push notifications)
✓ Enable Cloud Functions (needs Blaze plan — pay-as-you-go, ~free for personal use)
✓ Get your Firebase config object (Project Settings → Your Apps → Web App)
```

### Step 3: Install Tools
```
✓ Download Antigravity 2.0 → antigravity.google/download
✓ Download Cursor → cursor.sh
✓ Install Node.js 20+ → nodejs.org
✓ Install VS Code → code.visualstudio.com
✓ Install GitHub Copilot extension in VS Code
```

---

## 📋 PHASE 1 — PLANNING IN ANTIGRAVITY
### Tool: Antigravity 2.0 | Mode: Planning Mode

Open Antigravity → New Chat → Select **Planning Mode**

---

### 🔴 MASTER PROMPT 1 — Project Analysis

```
You are a Senior Full-Stack Developer and PWA specialist 
with expertise in React, Firebase, and AI integration.

## MY APP: DailyCoach AI

A Progressive Web App (PWA) that acts as a personal 
AI life coach and timetable manager.

## HOW IT WORKS:
1. User sets their daily schedule in the app UI
   Example: "Lunch — 1:00 PM to 2:00 PM"

2. At 1:00 PM — app sends push notification
   AND speaks aloud: 
   "Hey Vagesh! It's 1:00 PM — time for your lunch!
   You have until 2:00 PM. Don't skip it!"

3. At 2:05 PM — app asks via voice:
   "Hey Vagesh, did you have your lunch?"

4. User says YES or taps YES button:
   → App says: "Great job Vagesh! Marked complete!"
   → Saves to Firestore as DONE with timestamp

5. User says NO or taps NO button:
   → App says: "You're breaking your routine Vagesh!
      Please have your lunch now."
   → Saves as MISSED with timestamp

6. Daily dashboard shows completion tracking
   (green=done, yellow=late, red=missed)

## TECH STACK (already decided):
- React + Vite + vite-plugin-pwa
- Tailwind CSS
- Firebase (Auth + Firestore + Cloud Functions + FCM)
- Gemini API (for AI voice message generation)
- Web Speech API (TTS + STT — speak and listen)
- Vercel (deployment)

## FIREBASE ARCHITECTURE (No separate server):
- Cloud Functions replace node-cron scheduling
- A function runs every minute, checks Firestore
  for tasks due NOW, sends push notifications
- No separate Node.js backend server needed

## YOUR TASK (NO CODE YET):
1. Confirm if this architecture is correct and optimal
2. List any technical risks I haven't thought of
3. Suggest any improvements to the approach
4. Confirm the complete folder structure I provided
   is correct or suggest improvements
5. List all npm packages needed with exact names
6. List all Firebase services needed and how they connect
```

---

### 🔴 MASTER PROMPT 2 — Create Project Bible Files

After getting Prompt 1 response, send this:

```
Perfect. Now create two files I will save locally:

## FILE 1: AGENTS.md
This file will be given to every AI agent working 
on this project so they understand the full context.

Include:
- App name: DailyCoach AI
- App purpose (copy from above)
- Complete tech stack
- Complete folder structure (every file)
- All npm packages with versions
- Firebase collections and field names:
  * users/{uid}: name, email, createdAt
  * users/{uid}/schedules/{id}: taskName, startTime, 
    endTime, days[], isActive, color
  * users/{uid}/dailyLogs/{date}/{taskId}: 
    status (done/late/missed), completedAt, scheduledTime
- Color system:
  * Morning (5am-12pm) = Blue #3B82F6
  * Afternoon (12pm-5pm) = Orange #F97316
  * Evening (5pm-9pm) = Purple #8B5CF6
  * Night (9pm-5am) = Dark #1E293B
  * Done = Green #22C55E
  * Late = Yellow #EAB308
  * Missed = Red #EF4444
- Voice flow logic:
  * At startTime: speak reminder
  * At startTime+5min: ask if completed (if no response)
  * YES response: mark done, speak congratulation
  * NO response: mark missed, speak encouragement
  * No response in 10 min: mark as no-response, try once more
- Coding rules:
  * No placeholders or TODO comments
  * Every function fully implemented
  * Full error handling with try/catch
  * Console.log for debugging key events
  * Mobile-first responsive design

## FILE 2: BUILD_ORDER.md
Step-by-step build sequence:
- Phase 1: Project setup + config files
- Phase 2: Firebase services layer
- Phase 3: Gemini AI service
- Phase 4: Voice service (TTS + STT)
- Phase 5: Authentication pages
- Phase 6: Schedule Builder page
- Phase 7: Dashboard + reminder modal
- Phase 8: Reports page
- Phase 9: PWA config (manifest + service worker)
- Phase 10: Firebase Cloud Functions
- Phase 11: Testing + deployment

For each phase list:
- Exact files to create
- Exact npm commands to run
- How to test that phase works

Output both files completely. No placeholders.
```

**Save these two files to your project folder. They are your project bible.**

---

## 📋 PHASE 2 — BUILD WITH ANTIGRAVITY AGENTS
### Tool: Antigravity 2.0 | Mode: Agent Manager (Ctrl+Shift+A)

Spawn 3 agents simultaneously:

---

### 🤖 AGENT 1 — Foundation Agent

**Name: `Foundation-Agent`**

```
READ AGENTS.md and BUILD_ORDER.md in this project first.

Your job: Build Phase 1 and Phase 2 (Foundation + Firebase).

## PHASE 1 — PROJECT SETUP

Run these commands and confirm success:
npm create vite@latest dailycoach-pwa -- --template react
cd dailycoach-pwa
npm install

Then install ALL dependencies:
npm install firebase
npm install @google/generative-ai  
npm install react-router-dom
npm install tailwindcss postcss autoprefixer
npm install vite-plugin-pwa workbox-window
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

## PHASE 1 FILES TO CREATE:

### 1. vite.config.js
Complete PWA configuration using vite-plugin-pwa.
Include:
- registerType: 'autoUpdate'
- manifest with name, icons, theme color, display: standalone
- workbox config for offline caching
- includeAssets for icons

### 2. tailwind.config.js  
Configure with all content paths.
Add custom colors:
- morning: '#3B82F6'
- afternoon: '#F97316'  
- evening: '#8B5CF6'
- night-dark: '#1E293B'
- done: '#22C55E'
- late: '#EAB308'
- missed: '#EF4444'

### 3. .env (example — I will fill real values)
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_key

### 4. public/manifest.json
PWA manifest. Include:
- name: "DailyCoach AI"
- short_name: "DailyCoach"
- theme_color: "#1E293B"
- background_color: "#0F172A"
- display: "standalone"
- start_url: "/"
- icons for 192x192 and 512x512

### 5. public/firebase-messaging-sw.js
Service worker for Firebase push notifications.
Handle background message display.
Show notification with title and body from FCM payload.

## PHASE 2 — FIREBASE SERVICES

### 6. src/config/firebase.js
Initialize Firebase with env variables.
Export: app, auth, db (Firestore), messaging (FCM).
Include getToken setup for FCM.
Handle messaging not supported (some browsers).

### 7. src/config/gemini.js
Initialize Google Generative AI with VITE_GEMINI_API_KEY.
Export configured gemini model (gemini-1.5-flash).

### 8. src/services/scheduleService.js
Complete Firestore CRUD for schedules:

getSchedules(userId) → fetch all user schedules
addSchedule(userId, scheduleData) → create new schedule
updateSchedule(userId, scheduleId, data) → update existing
deleteSchedule(userId, scheduleId) → delete
toggleSchedule(userId, scheduleId, isActive) → on/off
subscribeToSchedules(userId, callback) → real-time listener

### 9. src/services/notificationService.js
requestNotificationPermission() → ask user permission
getFCMToken() → get device FCM token
saveFCMToken(userId, token) → save to Firestore
showLocalNotification(title, body) → immediate notification

### 10. src/services/logService.js
logTaskCompletion(userId, taskId, date, status, completedAt)
  → saves to users/{uid}/dailyLogs/{date}/{taskId}
  
getTodayLogs(userId, date) → fetch today's completion data
getWeekLogs(userId, startDate) → fetch week data
getStreakCount(userId) → calculate consecutive complete days

ALL FILES: No placeholders. Complete working code.
Start now. Tell me when each file is done.
```

---

### 🤖 AGENT 2 — AI + Voice Agent

**Name: `Voice-AI-Agent`**

```
READ AGENTS.md before starting.

Your job: Build the AI brain and voice system.

## FILE 1: src/services/geminiService.js

This service generates ALL spoken messages using Gemini API.

Build these functions:

### generateReminderMessage(userName, taskName, startTime, endTime)
Calls Gemini with this prompt:
"You are DailyCoach, a warm and motivating personal life coach AI.
Generate a friendly reminder message for {userName} that their 
{taskName} starts now at {startTime} and ends at {endTime}.
Keep it under 2 sentences. Sound like a caring friend.
Use their name naturally. Be encouraging."

Returns: string (the message to speak)

### generateFollowUpMessage(userName, taskName, minutesLate)
Prompt: "Generate a gentle follow-up for {userName} asking if 
they completed their {taskName} which was due {minutesLate} 
minutes ago. Ask as a yes or no question. Keep it short."

Returns: string

### generateCompletionResponse(userName, taskName, isOnTime)
If onTime: "Generate warm congratulations for {userName} 
completing {taskName} on time. 1 sentence, enthusiastic."
If late: "Generate a positive but honest response for {userName} 
who completed {taskName} late. Acknowledge the delay but 
still encourage. 1 sentence."

Returns: string

### generateMissedResponse(userName, taskName)
Prompt: "Generate a firm but caring response for {userName} 
who missed their {taskName}. Encourage them to do it now 
if possible. 1-2 sentences."

Returns: string

### generateDailySummary(userName, stats)
stats = { total, completed, late, missed, percentage }
Prompt: "Generate a personalized daily summary for {userName}.
Stats: completed {completed}/{total} tasks on time, 
{late} late, {missed} missed ({percentage}% success rate).
Be honest but motivating. 2-3 sentences."

Returns: string

ERROR HANDLING: If Gemini API fails, return 
pre-written fallback message strings (hardcode 2-3 fallbacks 
per function type so app never breaks silently).

## FILE 2: src/services/voiceService.js

Complete Web Speech API implementation.

### speak(text, options)
Uses SpeechSynthesis API.
Options: { rate: 1.0, pitch: 1.0, volume: 1.0, voiceName: null }
Returns Promise that resolves when speaking finishes.
Cancel any current speech before starting new one.

### listen(options)
Uses SpeechRecognition API.
Options: { timeout: 10000, language: 'en-IN' }
Returns Promise that resolves with:
{ 
  heard: 'yes' | 'no' | 'unknown',
  rawText: string,
  confidence: number
}

Detect YES from: "yes", "yeah", "yep", "done", "completed", 
"haan", "ha", "ha ji" (Indian responses)
Detect NO from: "no", "nope", "not yet", "nahi", "na"

Timeout: if no response in 10 seconds, resolve with 'unknown'

### isVoiceSupported()
Returns { tts: boolean, stt: boolean }
Check browser support for both APIs.

### getAvailableVoices()
Returns list of available TTS voices.
Prefer: Google India English, Google UK English Female.

## FILE 3: src/hooks/useVoice.js

React hook that manages the complete conversation flow:

useVoice() returns:
- isListening: boolean
- isSpeaking: boolean
- runReminderFlow(task, userName) → runs complete flow:
  1. Generate reminder message via Gemini
  2. Speak it via TTS
  3. Wait 3 seconds
  4. Generate follow-up question
  5. Speak follow-up
  6. Listen for YES/NO (10 sec timeout)
  7. Based on response, generate + speak response
  8. Return { response: 'yes'|'no'|'unknown' }
- stopAll() → stop speaking + listening

All complete. No placeholders.
```

---

### 🤖 AGENT 3 — UI Agent

**Name: `UI-Agent`**

```
READ AGENTS.md before starting.

Your job: Build all UI pages and components.

Design direction: 
- Dark theme (#0F172A background)
- Clean, modern, mobile-first
- Font: Use 'Space Mono' for times/numbers, 
  'DM Sans' for text (Google Fonts)
- Cards with subtle borders and glass effect
- Smooth transitions on all interactions
- Color coding by time of day (from AGENTS.md)

## COMPONENT 1: src/components/Navbar.jsx
Bottom navigation bar (mobile-first):
- 4 icons: Home, Schedule, Reports, Settings
- Active state highlighted
- Uses react-router-dom Link

## COMPONENT 2: src/components/TaskCard.jsx
Props: task, log (completion data), onClick
Shows:
- Time range (start - end)
- Task name
- Status badge (Done/Late/Missed/Upcoming/Active)
- Color left border based on time of day
- If active now: glowing pulse animation

## COMPONENT 3: src/components/ReminderModal.jsx
This is the MOST IMPORTANT component.
Shows when a reminder fires. Full-screen modal.

Props: task, userName, onComplete(response), onClose

Shows:
- Task name and time (large text)
- Animated pulse/wave while AI is speaking
- "Listening..." state with microphone animation
- YES button (green, large) 
- NO button (red, large)
- Always show buttons as fallback
- Loading state while Gemini generates message

Uses useVoice hook to run the full conversation flow.

## COMPONENT 4: src/components/Timeline.jsx
Props: tasks, logs, currentTime

Vertical timeline showing today's schedule:
- Each task as a timeline item
- Current time marker (animated red line)
- Past tasks show completion status
- Future tasks show time until due
- Scrolls to current time automatically

## PAGE 1: src/pages/Login.jsx
Clean login/register page.
- Email + password fields
- Toggle between login and register
- "DailyCoach AI" branding
- Google sign-in button (optional)
- Uses Firebase Auth
- Redirect to dashboard on success

## PAGE 2: src/pages/Dashboard.jsx
Main page. Shows:
- Greeting: "Good afternoon, Vagesh 🌤️"
- Today's progress: "3/6 tasks completed"
- Progress bar showing completion %
- Timeline component for today's tasks
- Reminder modal appears when task is due
- Real-time Firestore listener for task updates

REMINDER TRIGGER LOGIC (CLIENT-SIDE):
Every 30 seconds, check if any active task's 
startTime matches current time (within 1 minute).
If yes → show ReminderModal.

Also check: 5 minutes after startTime, if no log exists
for that task → show follow-up ReminderModal.

## PAGE 3: src/pages/ScheduleBuilder.jsx
Add and manage schedules.

Two sections:
1. ADD NEW SCHEDULE form:
   - Task name (text input)
   - Start time (time picker)
   - End time (time picker)
   - Days of week (Mon-Sun toggle buttons)
   - Color (auto-assigned by time of day)
   - Submit button

2. MY SCHEDULES list:
   - Card for each schedule
   - Toggle switch (on/off)
   - Edit button (fills form with existing data)
   - Delete button (with confirmation)

## PAGE 4: src/pages/Reports.jsx
Weekly and monthly view.

Shows:
- This week's heatmap (7 colored squares)
- Current streak count: "🔥 5 days streak!"
- Task completion percentage this week
- List of tasks with completion rates
- Best performed task badge
- Most missed task warning

## PAGE 5: src/pages/Settings.jsx
User preferences:
- Display name (editable)
- Voice speed slider (0.5x to 2x)
- Voice pitch slider
- Enable/disable voice (toggle)
- Notification permission button
- Sign out button

## App.jsx
React Router setup:
/ → Dashboard (protected)
/login → Login
/schedule → ScheduleBuilder (protected)
/reports → Reports (protected)
/settings → Settings (protected)

Protected route: redirect to /login if not authenticated.

## src/contexts/AuthContext.jsx
Firebase auth state management.
Provides: currentUser, loading, signIn, signUp, signOut.

## src/contexts/ScheduleContext.jsx
Provides: schedules, loading, addSchedule, updateSchedule,
deleteSchedule, todayLogs.

All complete. No placeholders. Mobile-first design.
Use only Tailwind CSS classes. No inline styles.
```

---

## 📋 PHASE 3 — FIREBASE CLOUD FUNCTIONS
### Tool: Antigravity — New Agent After Phase 2

**Name: `Functions-Agent`**

```
READ AGENTS.md before starting.

Your job: Build Firebase Cloud Functions for 
scheduled reminder notifications.

Context: Instead of a node-cron server, Firebase 
Cloud Functions check every minute if any user 
has a task starting now and sends a push notification.

## SETUP:
cd functions
npm install firebase-admin firebase-functions

## FILE: functions/index.js

Build these functions:

### 1. checkReminders (runs every minute)
exports.checkReminders = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
  
  Logic:
  - Get current time (hour:minute format)
  - Query Firestore: all users → all schedules 
    where isActive=true
  - For each schedule where startTime matches 
    current time AND today is in schedule.days:
    * Check if dailyLog for today already exists
    * If no log exists → send FCM push notification
      to user's FCM token stored in Firestore
    * Notification payload:
      { title: "DailyCoach Reminder",
        body: "Time for: {taskName}",
        data: { taskId, taskName, startTime, endTime } }
  
  - Also check follow-ups:
    * Schedules where startTime was 5 minutes ago
    * If no completion log exists yet
    * Send follow-up notification

### 2. generateDailySummary (runs every day at 10 PM)
exports.dailySummary = functions.pubsub
  .schedule('0 22 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
  
  Logic:
  - For each user with FCM token
  - Get today's completion logs
  - Calculate stats
  - Send summary push notification

### 3. cleanOldLogs (runs weekly)
Delete daily logs older than 90 days.

IMPORTANT NOTES:
- Use admin.messaging() for FCM (not client SDK)
- Store FCM token in users/{uid}/fcmToken
- Handle errors per user (don't fail all if one fails)
- Add IST timezone handling (Asia/Kolkata UTC+5:30)
- Log key events with console.log for debugging

Complete implementation. No placeholders.
```

---

## 📋 PHASE 4 — PWA TESTING CHECKLIST
### Tool: All Three Tools

### Test Voice System (Browser Console):
```javascript
// Test TTS
window.speechSynthesis.speak(
  new SpeechSynthesisUtterance("Hey Vagesh, time for lunch!")
)

// Test STT — say something after running this
const r = new webkitSpeechRecognition()
r.onresult = e => console.log(e.results[0][0].transcript)
r.start()
```

### Test PWA Install:
```
1. Open Chrome on Android
2. Visit your Vercel URL
3. Tap "Add to Home Screen" in browser menu
4. App should appear on home screen with your icon
5. Open from home screen — should look like native app
```

### Test Push Notifications:
```
1. Allow notifications when prompted
2. Open browser console
3. Go to Firebase Console → Cloud Messaging
4. Send test notification to your FCM token
5. Should appear even when app is in background
```

### Test Reminder Flow:
```
1. Create a test schedule for 2 minutes from now
2. Wait for the time to arrive
3. Push notification should appear
4. Click notification → app opens → reminder modal shows
5. AI speaks the reminder (check volume is on)
6. Tap YES → should mark as done
7. Check dashboard → task should show green
8. Check Firestore → log should be saved
```

---

## 📋 PHASE 5 — CURSOR FOR BUG FIXING

### When Voice Doesn't Work:
Open the file in Cursor → Ctrl+L → paste this:

```
The Web Speech API in my React app is not working correctly.

Problem: [describe exact issue]

File: src/services/voiceService.js
[paste full file code]

Common issues to check:
1. Is SpeechSynthesis being called before user interaction?
   (Browser blocks autoplay audio)
2. Is SpeechRecognition using correct constructor?
   (webkitSpeechRecognition for Chrome)
3. Are Promises being resolved/rejected correctly?
4. Is there a race condition between speak() and listen()?

Fix the complete file. No placeholders.
Show me what changed and why.
```

### When Firebase Doesn't Connect:
```
Firebase is throwing this error: [paste error]

Check:
1. Are all .env variables loaded correctly?
2. Is firebase.js initialization correct?
3. Are Firestore security rules blocking access?
   (Paste rules here)
4. Is the collection path correct?

File: [paste file with error]

Fix completely.
```

### When Notifications Don't Fire:
```
Push notifications are not appearing on my device.

Setup:
- Firebase Cloud Functions deployed ✓ / ✗
- FCM token saved to Firestore ✓ / ✗  
- Notification permission granted ✓ / ✗
- firebase-messaging-sw.js in public folder ✓ / ✗

Error from Functions logs: [paste error]

Files involved:
1. public/firebase-messaging-sw.js: [paste]
2. src/services/notificationService.js: [paste]
3. functions/index.js: [paste]

Find the issue. Fix all affected files completely.
```

---

## 📋 PHASE 6 — DEPLOYMENT
### Tool: Antigravity Chat

```
Help me deploy DailyCoach AI PWA to Vercel.

My project structure:
- Frontend: React + Vite in root folder
- Firebase Functions: in /functions folder

Steps I need:
1. Exact commands to build the frontend
2. How to set environment variables in Vercel dashboard
3. Firebase Functions deployment command
4. How to update manifest.json with production URL
5. How to test PWA installation from production URL
6. How to set up custom domain (optional)

Give me the exact terminal commands in order.
No explanation needed — just the commands.
```

**Deploy Commands:**
```bash
# 1. Build frontend
npm run build

# 2. Deploy to Vercel
npx vercel --prod

# 3. Deploy Firebase Functions
cd functions
npm install
cd ..
firebase deploy --only functions

# 4. Set Firebase hosting (optional)
firebase deploy --only hosting
```

---

## 📋 COMPLETE DAY-BY-DAY BUILD PLAN

### DAY 1 — Foundation (2-3 hours)
```
Morning:
□ Create Firebase project + enable all services
□ Get Gemini API key from AI Studio
□ Install all tools (Antigravity, Cursor, VS Code)
□ Run Prompt 1 (analysis) in Antigravity

Afternoon:
□ Run Prompt 2 (get AGENTS.md + BUILD_ORDER.md)
□ Save both files to project folder
□ Create project with: npm create vite@latest
□ Install all npm packages

Evening:
□ Fill in .env with real API keys
□ Test Firebase connection in browser console
```

### DAY 2 — Firebase + AI Services (3-4 hours)
```
□ Spawn Foundation-Agent in Antigravity
□ Generate and test: firebase.js, gemini.js
□ Generate and test: scheduleService.js
□ Generate and test: notificationService.js
□ Test: Can you read/write to Firestore?
□ Test: Does Gemini API respond?
```

### DAY 3 — Voice System (2-3 hours)
```
□ Spawn Voice-AI-Agent
□ Generate: geminiService.js (AI messages)
□ Generate: voiceService.js (TTS + STT)
□ Test voice in browser: does it speak?
□ Test: does it listen and detect "yes"/"no"?
□ Fix issues with Cursor if any
```

### DAY 4 — UI Pages (4-5 hours)
```
□ Spawn UI-Agent
□ Generate: Navbar, TaskCard, Timeline components
□ Generate: Login page → test login works
□ Generate: Dashboard page → test it loads
□ Generate: ScheduleBuilder → test adding a schedule
□ Fix any UI issues in Cursor
```

### DAY 5 — Reminder Flow (3-4 hours)
```
□ Generate: ReminderModal component
□ Connect Dashboard to check reminders every 30 seconds
□ Test: Create schedule for 2 mins from now
□ Test: Does modal appear at right time?
□ Test: Does voice speak?
□ Test: Does YES/NO work?
□ Test: Does it save to Firestore?
```

### DAY 6 — Cloud Functions + PWA (3-4 hours)
```
□ Spawn Functions-Agent
□ Generate: functions/index.js
□ Deploy functions to Firebase
□ Test: Function runs every minute?
□ Test: Push notification received?
□ Configure PWA manifest
□ Test: Install app on Android phone
```

### DAY 7 — Polish + Deploy (2-3 hours)
```
□ Generate: Reports page
□ Generate: Settings page
□ Fix any remaining bugs
□ Run full end-to-end test
□ Deploy to Vercel
□ Test on real Android phone from production URL
□ Install PWA on phone
□ Celebrate! 🎉
```

---

## 🔑 GOLDEN RULES — READ BEFORE EVERY SESSION

```
1. ALWAYS start Antigravity sessions by saying:
   "Read AGENTS.md and BUILD_ORDER.md first"

2. ALWAYS test each file before moving to next

3. NEVER ask AI to build multiple pages at once

4. ALWAYS include voice button fallback 
   (not everyone's browser supports STT)

5. ALWAYS check Firestore security rules before deploy

6. NEVER commit .env file to GitHub

7. When stuck: paste EXACT error + FULL file to Cursor

8. Voice won't work on HTTP — must test on HTTPS 
   (use Vercel URL or https://localhost with cert)

9. Test on real Android phone, not just desktop browser

10. Firebase Functions need Blaze plan — 
    stay within free tier limits for personal use
```

---

## 🆘 COMMON ERRORS + FIXES

| Error | Likely Cause | Fix |
|---|---|---|
| "SpeechSynthesis not working" | User hasn't interacted with page | Trigger voice only after button click first time |
| "Permission denied — notifications" | User blocked notifications | Show instructions to re-enable in settings |
| "Firebase: quota exceeded" | Too many Firestore reads | Add caching, reduce real-time listeners |
| "Function timeout" | Cloud function too slow | Increase timeout in function config |
| "PWA not installable" | manifest.json issues | Check icons exist + HTTPS + start_url correct |
| "STT not working on Android" | Chrome needed | Show message: "Use Chrome for voice features" |
| "Gemini API key error" | Wrong env variable | Check VITE_ prefix in .env file |

---

## 📱 YOUR APP AFTER COMPLETION

When installed as PWA on Android:
- Tap app icon → opens like native app (no browser bar)
- 1:00 PM → notification appears on lock screen
- Tap notification → app opens in full screen  
- Voice speaks: "Hey Vagesh! Time for lunch!"
- User says "Yes" → marked done in database
- Dashboard shows green checkmark for lunch ✅

**This is your school routine digitized — for life.**
