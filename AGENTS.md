# AGENTS BIBLE: DailyCoach AI

## APP OVERVIEW
**App name:** DailyCoach AI
**App purpose:** A Progressive Web App (PWA) that acts as a personal AI life coach and timetable manager.

## TECH STACK
- **Frontend:** React + Vite + vite-plugin-pwa
- **Styling:** Tailwind CSS
- **Backend/Database:** Firebase (Auth + Firestore + Cloud Functions + FCM)
- **AI Engine:** Gemini API (for AI voice message generation)
- **Voice Engine:** Web Speech API (TTS + STT — speak and listen)
- **Deployment:** Vercel

## FOLDER STRUCTURE
```text
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

## NPM PACKAGES
**Core Dependencies:**
- `react` (^18.2.0)
- `react-dom` (^18.2.0)
- `react-router-dom` (^6.22.0)
- `firebase` (^10.8.0)
- `@google/generative-ai` (^0.2.1)
- `date-fns` (^3.3.1)
- `lucide-react` (^0.344.0)

**Dev Dependencies:**
- `vite` (^5.1.4)
- `@vitejs/plugin-react` (^4.2.1)
- `tailwindcss` (^3.4.1)
- `postcss` (^8.4.35)
- `autoprefixer` (^10.4.17)
- `vite-plugin-pwa` (^0.19.2)
- `workbox-window` (^7.0.0)

**Firebase Functions Dependencies (in `/functions`):**
- `firebase-admin` (^12.0.0)
- `firebase-functions` (^4.7.0)

## FIREBASE SCHEMA
*   **`users/{uid}`**: `name`, `email`, `createdAt`, `fcmToken`
*   **`users/{uid}/schedules/{id}`**: `taskName`, `startTime`, `endTime`, `days[]`, `isActive`, `color`
*   **`users/{uid}/dailyLogs/{date}/{taskId}`**: `status` (done/late/missed), `completedAt`, `scheduledTime`

## COLOR SYSTEM
*   Morning (5am-12pm) = Blue `#3B82F6`
*   Afternoon (12pm-5pm) = Orange `#F97316`
*   Evening (5pm-9pm) = Purple `#8B5CF6`
*   Night (9pm-5am) = Dark `#1E293B`
*   Done = Green `#22C55E`
*   Late = Yellow `#EAB308`
*   Missed = Red `#EF4444`

## VOICE FLOW LOGIC
1.  **At startTime:** Speak reminder via TTS.
2.  **At startTime + 5min:** Ask if completed (if no log exists yet).
3.  **YES response:** Mark as DONE in Firestore, speak congratulation message.
4.  **NO response:** Mark as MISSED in Firestore, speak encouragement message.
5.  **No response in 10 min:** Mark as no-response (or MISSED), try once more.

## CODING RULES
*   **No placeholders or TODO comments.** Write production-ready code.
*   **Every function fully implemented.** Do not leave stubs.
*   **Full error handling.** Wrap logic with `try/catch` blocks.
*   **Console.log for debugging.** Log key events, payload data, and state changes.
*   **Mobile-first responsive design.** Optimize UI for phone dimensions using Tailwind.
