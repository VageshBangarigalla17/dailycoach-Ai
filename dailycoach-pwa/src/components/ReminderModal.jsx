import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Check, X, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { showLocalNotification } from '../services/notificationService';
import { useVoiceUnlock } from '../hooks/useVoiceUnlock';

/**
 * ReminderModal — Full-screen voice conversation overlay.
 *
 * VOICE FLOW (step by step):
 * ──────────────────────────
 * 1. Modal mounts → beep plays to unlock audio context
 * 2. On desktop: auto-starts voice flow after beep
 *    On mobile: shows "Tap to Start" if auto-start fails
 * 3. Gemini generates the greeting message (or fallback fires instantly)
 * 4. AI SPEAKS the greeting aloud via TTS
 * 5. TTS finishes → microphone opens for 10 seconds (STT)
 * 6. User says "yes"/"no" OR taps a button
 * 7. AI SPEAKS a response (congratulation or encouragement)
 * 8. Status saved to backend via onComplete callback
 * 9. Modal auto-closes after 3 seconds
 *
 * Props:
 *   task          — { taskName, startTime, endTime, ... }
 *   userName      — The user's first name
 *   reminderType  — 'start' | 'followup'
 *   voiceOptions  — { rate, pitch } from user settings
 *   onComplete    — (status, voiceResponse) => void
 *   onClose       — () => void
 */
export default function ReminderModal({ task, userName, reminderType, voiceOptions, onComplete, onClose }) {
  const {
    isSpeaking, isListening, message, voiceError,
    speak, listen, stop, playBeep,
    generateStartMessage, generateFollowupMessage, generateResponseMessage,
    isSTTSupported,
  } = useVoice();

  // Phase tracks the conversation state machine
  // 'waiting' → 'generating' → 'speaking' → 'listening' → 'responding' → 'done'
  const [phase, setPhase] = useState('waiting');
  const [aiText, setAiText] = useState('');
  const [listenCountdown, setListenCountdown] = useState(30);
  const mountedRef = useRef(true);
  const flowStartedRef = useRef(false);
  const responseProcessedRef = useRef(false);
  const autoStartAttemptsRef = useRef(0);
  const wakeLockRef = useRef(null);

  // Stabilise onComplete reference so useEffect doesn't re-trigger
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Cleanup on unmount — cancel any in-progress TTS/STT and release wake lock
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.warn);
        wakeLockRef.current = null;
      }
    };
  }, [stop]);

  // ------------------------------------------------------------------
  // Listening countdown timer (visual feedback)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'listening') {
      setListenCountdown(30);
      return;
    }

    const countdownInterval = setInterval(() => {
      setListenCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [phase]);

  // ------------------------------------------------------------------
  // Auto-close after "done" phase — 3 second delay + Wake Lock Release
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase === 'done') {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.warn);
        wakeLockRef.current = null;
        console.log('[ReminderModal] Screen Wake Lock released.');
      }

      const autoCloseTimer = setTimeout(() => {
        if (mountedRef.current) {
          console.log('[ReminderModal] Auto-closing after done phase.');
          onCloseRef.current();
        }
      }, 3000);

      return () => clearTimeout(autoCloseTimer);
    }
  }, [phase]);

  // ------------------------------------------------------------------
  // Handle visibility change to re-request Wake Lock if we were backgrounded
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && phase !== 'waiting' && phase !== 'done') {
        if ('wakeLock' in navigator && wakeLockRef.current === null) {
          try {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            console.log('[ReminderModal] Screen Wake Lock re-acquired on visibility change.');
          } catch (err) {
            console.warn('[ReminderModal] Wake Lock re-acquisition failed:', err);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [phase]);

  const { isUnlocked, unlockAudio } = useVoiceUnlock();

  // ------------------------------------------------------------------
  // Unlock audio + start the conversation flow
  // ------------------------------------------------------------------
  const startFlow = useCallback(async () => {
    if (flowStartedRef.current) return;
    flowStartedRef.current = true;

    try {
      // STEP 0: Unlock audio explicitly via the new hook
      const unlocked = await unlockAudio();
      if (!unlocked) {
        console.warn('[ReminderModal] Audio context unlock failed.');
      }

      // Play beep as secondary feedback
      playBeep().catch(err => console.warn('[ReminderModal] Beep failed:', err));

      // STEP 0.5: Request Wake Lock
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('[ReminderModal] Screen Wake Lock acquired.');
        } catch (err) {
          console.warn('[ReminderModal] Screen Wake Lock failed:', err);
        }
      }

      // STEP 1: Generate AI message
      setPhase('generating');
      console.log(`[ReminderModal] Flow started — type: ${reminderType}, task: ${task.taskName}`);

      let greeting = '';
      let notifBody = '';
      if (reminderType === 'followup') {
        greeting = await generateFollowupMessage(userName || 'there', task.taskName, task.endTime);
        notifBody = `Your ${task.taskName} time just ended. Did you complete it?`;
      } else if (reminderType === 'second-chance') {
        greeting = await generateSecondChanceMessage(userName || 'there', task.taskName);
        notifBody = `Checking in again on ${task.taskName}. Have you completed it now?`;
      } else {
        greeting = await generateStartMessage(userName || 'there', task.taskName, task.startTime, task.endTime);
        notifBody = `It's ${task.startTime}! Time for ${task.taskName}.`;
      }
      if (!mountedRef.current) return;
      setAiText(greeting);

      // Fire a local push notification (visible even if app isn't focused)
      showLocalNotification(
        `⏰ ${task.taskName}`,
        notifBody
      );

      // STEP 2: SPEAK the greeting aloud — this is the critical voice call
      setPhase('speaking');
      console.log('[ReminderModal] About to speak:', greeting.substring(0, 60));
      await speak(greeting, voiceOptions || {});
      if (!mountedRef.current) return;
      console.log('[ReminderModal] Speaking finished, switching to listening.');

      // STEP 3: Listen for voice response (30-second timeout)
      setPhase('listening');
      const response = await listen(30000);
      if (!mountedRef.current) return;
      console.log('[ReminderModal] Heard response:', response);

      // STEP 4: Process the response
      setPhase('responding');
      await handleVoiceResponse(response);

    } catch (error) {
      console.error('[ReminderModal] Flow error:', error);
      if (mountedRef.current) {
        setPhase('done');
      }
    }
  }, [task, userName, reminderType, voiceOptions, speak, listen, playBeep, generateStartMessage, generateFollowupMessage]);

  // Auto-start on desktop — aggressive retry with beep unlock
  useEffect(() => {
    const attemptAutoStart = () => {
      if (flowStartedRef.current) return;
      autoStartAttemptsRef.current += 1;

      console.log(`[ReminderModal] Auto-start attempt ${autoStartAttemptsRef.current}/3`);

      // Try to start. If it works, great. If not, retry.
      startFlow().catch((err) => {
        console.warn('[ReminderModal] Auto-start attempt failed:', err);
        flowStartedRef.current = false; // Allow retry
      });
    };

    // First attempt after 300ms
    const timer1 = setTimeout(attemptAutoStart, 300);

    // Second attempt after 1s (if first failed)
    const timer2 = setTimeout(() => {
      if (!flowStartedRef.current && autoStartAttemptsRef.current < 3) {
        attemptAutoStart();
      }
    }, 1000);

    // Third attempt after 2s (if both failed)
    const timer3 = setTimeout(() => {
      if (!flowStartedRef.current && autoStartAttemptsRef.current < 3) {
        attemptAutoStart();
      }
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [startFlow]);

  // ------------------------------------------------------------------
  // Handle the voice (or button) response
  // ------------------------------------------------------------------
  const handleVoiceResponse = useCallback(async (response) => {
    if (responseProcessedRef.current) return;
    responseProcessedRef.current = true;
    
    const lower = (response || '').toLowerCase();
    
    // Different trigger words depending on reminderType
    let isYes = false;
    if (reminderType === 'start') {
      isYes = lower.includes('ok') || lower.includes('ready') || lower.includes('start') || lower.includes('sure') || lower.includes('yes') || lower.includes('yeah') || lower.includes('on it');
    } else {
      isYes = lower.includes('yes') || lower.includes('yeah') || lower.includes('yep') || lower.includes('done') || lower.includes('completed') || lower.includes('finished');
    }

    const isNoResponse = lower === 'no-response' || lower === '';

    let status;
    if (isYes) {
      if (reminderType === 'start') {
        status = 'active'; // Just starting
      } else if (reminderType === 'followup') {
        status = 'done'; // Completed on time
      } else if (reminderType === 'second-chance') {
        status = 'late'; // Completed after the 10 min window
      }
    } else if (isNoResponse) {
      status = 'no-response';
    } else {
      status = 'missed';
    }

    // Generate + speak the AI feedback response (except for 'active' which we can just use a simple message for)
    let responseMsg = '';
    if (status === 'active') {
      responseMsg = `Awesome! Let's get to work on ${task.taskName}. I'll check back in at ${task.endTime}.`;
    } else {
      const feedbackStatus = status === 'no-response' ? 'no-response' : status;
      responseMsg = await generateResponseMessage(userName || 'there', task.taskName, feedbackStatus);
    }
    if (!mountedRef.current) return;
    setAiText(responseMsg);
    console.log('[ReminderModal] Speaking response:', responseMsg.substring(0, 60));
    await speak(responseMsg, voiceOptions || {});

    if (!mountedRef.current) return;
    setPhase('done');

    // Save to backend
    onCompleteRef.current(status, response || 'no-response');
  }, [task, userName, reminderType, voiceOptions, speak, generateResponseMessage]);

  // ------------------------------------------------------------------
  // Manual button handlers (fallback for no-mic or impatient users)
  // ------------------------------------------------------------------
  const handleManualYes = useCallback(async () => {
    stop(); // kill any in-progress listening
    setPhase('responding');
    await handleVoiceResponse('yes');
  }, [stop, handleVoiceResponse]);

  const handleManualNo = useCallback(async () => {
    stop();
    setPhase('responding');
    await handleVoiceResponse('no');
  }, [stop, handleVoiceResponse]);

  const handleDismiss = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);

  // ------------------------------------------------------------------
  // Visual helpers
  // ------------------------------------------------------------------
  const getRingStyles = () => {
    if (phase === 'waiting' || phase === 'generating') return 'bg-slate-800 border-slate-600';
    if (phase === 'speaking' || isSpeaking) return 'bg-morning/20 border-morning shadow-[0_0_50px_rgba(59,130,246,0.4)]';
    if (phase === 'listening' || isListening) return 'bg-done/20 border-done shadow-[0_0_50px_rgba(34,197,94,0.4)]';
    if (phase === 'responding') return 'bg-afternoon/20 border-afternoon shadow-[0_0_50px_rgba(249,115,22,0.4)]';
    return 'bg-slate-800 border-slate-600';
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'waiting': return '🎙 Tap to hear your coach';
      case 'generating': return 'Preparing message…';
      case 'speaking': return 'Coach is speaking…';
      case 'listening': return `Listening… ${listenCountdown}s remaining`;
      case 'responding': return 'Processing…';
      case 'done': return '✅ Done! Closing in 3s…';
      default: return '';
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl p-6 transition-all duration-500">

      {/* Close / Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-6 right-6 p-3 rounded-full bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-slate-800"
        aria-label="Close reminder"
      >
        <X size={24} />
      </button>

      {/* Badge: Start Reminder vs Follow-up */}
      <div className="absolute top-6 left-6">
        <span className={`text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider ${
          reminderType === 'followup'
            ? 'bg-afternoon/20 text-afternoon border border-afternoon/30'
            : 'bg-morning/20 text-morning border border-morning/30'
        }`}>
          {reminderType === 'followup' ? '⏰ Follow-up' : '🔔 Reminder'}
        </span>
      </div>

      {/* Task name + time window */}
      <div className="text-center mb-10 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-4xl font-bold font-sans text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-wide">{task.taskName}</h2>
        <p className="text-xl font-medium font-sans text-morning drop-shadow-[0_0_10px_rgba(14,165,233,0.5)] tracking-widest">{task.startTime} – {task.endTime}</p>
      </div>

      {/* Voice visualiser + message area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">

        {/* ── "Tap to Start" button (mobile audio unlock) ── */}
        {phase === 'waiting' && (
          <button
            onClick={startFlow}
            className="flex flex-col items-center justify-center w-44 h-44 rounded-full bg-gradient-to-br from-morning/30 to-evening/20 border-4 border-morning text-morning hover:from-morning/40 hover:to-evening/30 active:scale-95 transition-all shadow-[0_0_60px_rgba(59,130,246,0.4)] animate-pulse"
          >
            <Volume2 size={52} className="mb-3" />
            <span className="text-sm font-bold uppercase tracking-wider">Tap to Start</span>
            <span className="text-[10px] text-morning/70 mt-1">Hear your coach</span>
          </button>
        )}

        {/* ── Animated ring for active phases ── */}
        {phase !== 'waiting' && (
          <div className={`
            relative flex items-center justify-center w-40 h-40 rounded-full mb-6
            transition-all duration-700 ease-out ${phase === 'speaking' || isSpeaking ? 'scale-110 shadow-[0_0_80px_rgba(14,165,233,0.4)] bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-blue-500/50' : phase === 'listening' || isListening ? 'scale-100 shadow-[0_0_80px_rgba(16,185,129,0.4)] bg-gradient-to-tr from-emerald-500/20 to-green-600/20 border border-green-500/50' : 'scale-100 shadow-[0_0_40px_rgba(255,255,255,0.05)] bg-slate-900 border border-slate-800'}
          `}>
            {/* Siri-style orb layers */}
            {(isSpeaking || phase === 'speaking') && (
              <>
                <div className="absolute inset-0 rounded-full border border-blue-400/50 animate-ping opacity-70 blur-sm"></div>
                <div className="absolute -inset-4 rounded-full border-4 border-blue-500/30 animate-pulse blur-md shadow-[0_0_50px_rgba(14,165,233,0.6)]"></div>
              </>
            )}
            {(isListening || phase === 'listening') && (
              <>
                <div className="absolute inset-0 rounded-full border border-green-400/50 animate-pulse blur-sm"></div>
                <div className="absolute -inset-6 rounded-full border-2 border-green-500/20 animate-ping opacity-40 blur-lg shadow-[0_0_50px_rgba(16,185,129,0.6)]"></div>
              </>
            )}

            {/* Center icon based on phase */}
            {phase === 'generating' && (
              <Loader2 size={48} className="text-slate-400 animate-spin drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
            )}
            {phase === 'speaking' && (
              <Volume2 size={48} className="text-white animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
            )}
            {phase === 'listening' && (
              <div className="flex flex-col items-center">
                <Mic size={40} className="text-white animate-bounce" />
                <span className="text-white text-lg font-bold font-sans mt-1">{listenCountdown}s</span>
              </div>
            )}
            {phase === 'responding' && (
              <Loader2 size={48} className="text-orange-500 animate-spin" />
            )}
            {phase === 'done' && (
              <Check size={48} className="text-green-500" />
            )}
          </div>
        )}

        {/* Phase label */}
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-6 animate-pulse drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]">
          {getPhaseLabel()}
        </p>

        {/* Voice error warning */}
        {voiceError && (
          <div className="flex items-center gap-2 mb-3 text-late text-sm bg-late/10 px-4 py-2 rounded-lg border border-late/20">
            <AlertCircle size={16} />
            <span>{voiceError}</span>
          </div>
        )}

        {/* AI message text bubble */}
        {aiText && (
          <div className="bg-slate-900/70 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-3xl p-6 border border-slate-700/50 w-full min-h-[80px] transition-all duration-500 transform translate-y-0 opacity-100">
            <p className="text-center text-xl font-medium font-sans text-slate-200 leading-relaxed drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] tracking-wide">
              {aiText}
            </p>
          </div>
        )}

        {/* Voice status from hook */}
        {!aiText && message && phase !== 'waiting' && (
          <div className="bg-slate-900/70 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-3xl p-6 border border-slate-700/50 w-full min-h-[80px] transition-all duration-500">
            <p className="text-center text-xl font-medium font-sans text-slate-200 leading-relaxed drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] tracking-wide">
              {message}
            </p>
          </div>
        )}

        {/* STT not supported warning */}
        {!isSTTSupported && phase === 'listening' && (
          <div className="flex items-center gap-2 mt-3 text-late text-sm">
            <MicOff size={16} />
            <span>Voice input not available. Use the buttons below.</span>
          </div>
        )}
      </div>

      {/* YES / NO buttons — always visible once voice starts (fallback for users) */}
      {phase !== 'done' && phase !== 'generating' && phase !== 'waiting' && (
        <div className="w-full max-w-md mt-10 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <button
            onClick={handleManualYes}
            disabled={phase === 'responding'}
            className="flex items-center justify-center py-4 bg-done/10 hover:bg-done/20 active:bg-done/30 border border-done/40 rounded-2xl text-done font-bold font-sans transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] tracking-wider"
          >
            <Check size={24} className="mr-2 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" /> 
            {reminderType === 'start' ? "I'M READY" : "YES, DONE"}
          </button>
          <button
            onClick={handleManualNo}
            disabled={phase === 'responding'}
            className="flex items-center justify-center py-4 bg-missed/10 hover:bg-missed/20 active:bg-missed/30 border border-missed/40 rounded-2xl text-missed font-bold font-sans transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] tracking-wider"
          >
            <X size={24} className="mr-2 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" /> 
            {reminderType === 'start' ? "NOT NOW" : "NO, MISSED"}
          </button>
        </div>
      )}

      {/* Done phase — show final status */}
      {phase === 'done' && (
        <div className="w-full max-w-md mt-10 animate-in fade-in zoom-in duration-500">
          <button
            onClick={handleDismiss}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 shadow-[0_0_20px_rgba(255,255,255,0.05)] rounded-2xl text-white font-bold font-sans transition-all tracking-widest uppercase"
          >
            Close Now
          </button>
        </div>
      )}

    </div>
  );
}
