# BUILD ORDER: DailyCoach AI

## Phase 1: Project Setup + Config Files
*   **Objective:** Scaffold the Vite app and set up base configurations.
*   **Files to Create/Modify:** 
    *   `package.json`
    *   `vite.config.js`
    *   `tailwind.config.js`
    *   `.env`
*   **Commands:**
    ```bash
    npm create vite@latest dailycoach-pwa -- --template react
    cd dailycoach-pwa
    npm install
    npm install firebase @google/generative-ai react-router-dom lucide-react date-fns
    npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa workbox-window
    npx tailwindcss init -p
    ```
*   **Testing:** Run `npm run dev`. App should compile and render the default React screen. Check if Tailwind classes apply.

## Phase 2: Firebase Services Layer
*   **Objective:** Connect app to Firebase and build data services.
*   **Files to Create:**
    *   `src/config/firebase.js`
    *   `src/services/scheduleService.js`
    *   `src/services/logService.js`
    *   `src/services/notificationService.js`
*   **Testing:** Verify Firebase API keys log correctly. Use browser console to test `addSchedule()` and write a test document to Firestore.

## Phase 3: Gemini AI Service
*   **Objective:** Integrate Google's Gemini for conversational message generation.
*   **Files to Create:**
    *   `src/config/gemini.js`
    *   `src/services/geminiService.js`
*   **Testing:** Call `generateReminderMessage()` in the browser console. Verify it returns a well-formed string.

## Phase 4: Voice Service (TTS + STT)
*   **Objective:** Implement Web Speech APIs.
*   **Files to Create:**
    *   `src/services/voiceService.js`
    *   `src/hooks/useVoice.js`
*   **Testing:** Expose `speak()` and `listen()` to the window object and trigger them via browser console to confirm audio plays and microphone picks up "yes"/"no".

## Phase 5: Authentication Pages
*   **Objective:** Implement user login/registration.
*   **Files to Create:**
    *   `src/contexts/AuthContext.jsx`
    *   `src/pages/Login.jsx`
    *   `src/App.jsx` (add routing)
*   **Testing:** Register a new user. Check Firebase console Authentication tab to ensure the user was created. Ensure redirection to Dashboard works.

## Phase 6: Schedule Builder Page
*   **Objective:** Create the UI to build daily timetables.
*   **Files to Create:**
    *   `src/contexts/ScheduleContext.jsx`
    *   `src/pages/ScheduleBuilder.jsx`
*   **Testing:** Add, edit, and delete a schedule from the UI. Verify the changes reflect instantly in Firestore.

## Phase 7: Dashboard + Reminder Modal
*   **Objective:** The core view and the pop-up notification modal.
*   **Files to Create:**
    *   `src/pages/Dashboard.jsx`
    *   `src/components/TaskCard.jsx`
    *   `src/components/Timeline.jsx`
    *   `src/components/ReminderModal.jsx`
*   **Testing:** Create a task due 1 minute from now. Stay on Dashboard. Ensure the `ReminderModal` pops up, speaks, and accepts input.

## Phase 8: Reports Page
*   **Objective:** Show historical data and streaks.
*   **Files to Create:**
    *   `src/pages/Reports.jsx`
    *   `src/components/HeatMap.jsx`
*   **Testing:** Create mock logs in Firestore. Open Reports page and verify data charts/streak values match the database.

## Phase 9: PWA Config (Manifest + Service Worker)
*   **Objective:** Make the app installable and setup offline capabilities/FCM.
*   **Files to Create:**
    *   `public/manifest.json`
    *   `public/icon-192.png` & `public/icon-512.png`
    *   `public/firebase-messaging-sw.js`
*   **Testing:** Use Chrome DevTools (Application tab). Check if Manifest is valid and Service Worker is registered. Try "Add to Home Screen" on mobile.

## Phase 10: Firebase Cloud Functions
*   **Objective:** Setup backend cron jobs for serverless push notifications.
*   **Files to Create/Modify:**
    *   `/functions/package.json`
    *   `/functions/index.js`
*   **Commands:**
    ```bash
    cd functions
    npm install firebase-admin firebase-functions
    firebase deploy --only functions
    ```
*   **Testing:** Check Firebase Functions logs. Wait for a minute and check if the `checkReminders` function executes successfully.

## Phase 11: Testing + Deployment
*   **Objective:** Final end-to-end polish and Vercel hosting.
*   **Commands:**
    ```bash
    npm run build
    npx vercel --prod
    ```
*   **Testing:** Open the Vercel production URL on an Android device. Install the PWA. Lock the screen and wait for a scheduled task. Ensure push notification wakes the phone/shows up.
