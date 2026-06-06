import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Check, X, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { showLocalNotification } from '../services/notificationService';

/**
 * ReminderModal — Full-screen voice conversation overlay.
 *
 * Props:
 *   task          — { taskName, startTime, endTime, ... }
 *   userName      — The user's first name
 *   reminderType  — 'start' | 'followup'
 *   onComplete    — (status: 'done'|'late'|'missed', voiceResponse?: string) => void
 *   onClose       — () => void
 */
export default function ReminderModal({ task, userName, reminderType, onComplete, onClose }) {
  const {
    isSpeaking, isListening, message,
    speak, listen, stop,
    generateStartMessage, generateFollowupMessage, generateResponseMessage,
    isSTTSupported,
  } = useVoice();

  const [phase, setPhase] = useState('generating'); // generating | speaking | listening | responding | done
  const [aiText, setAiText] = useState('');
  const mountedRef = useRef(true);
  const flowStartedRef = useRef(false);

  // Stabilise onComplete reference to avoid re-triggering the flow
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [stop]);

  // ------------------------------------------------------------------
  // Main conversation flow — runs once when the modal mounts
  // ------------------------------------------------------------------
  useEffect(() => {
    if (flowStartedRef.current) return;
    flowStartedRef.current = true;

    const runFlow = async () => {
      try {
        // --- PHASE 1: Generate AI message ---
        setPhase('generating');
        console.log(`[ReminderModal] Flow started — type: ${reminderType}, task: ${task.taskName}`);

        let greeting = '';
        if (reminderType === 'followup') {
          greeting = await generateFollowupMessage(userName || 'there', task.taskName, task.endTime);
        } else {
          greeting = await generateStartMessage(userName || 'there', task.taskName, task.startTime, task.endTime);
        }
        if (!mountedRef.current) return;
        setAiText(greeting);

        // Fire a local notification so the user sees it even if the app isn't focused
        showLocalNotification(
          `⏰ ${task.taskName}`,
          reminderType === 'followup'
            ? `Your ${task.taskName} time just ended. Did you complete it?`
            : `It's ${task.startTime}! Time for ${task.taskName}.`
        );

        // --- PHASE 2: Speak the message aloud ---
        setPhase('speaking');
        await speak(greeting);
        if (!mountedRef.current) return;

        // --- PHASE 3: Listen for response ---
        setPhase('listening');
        const response = await listen(10000); // 10-second timeout
        if (!mountedRef.current) return;

        // --- PHASE 4: Process the response and speak feedback ---
        setPhase('responding');
        await handleVoiceResponse(response);

      } catch (error) {
        console.error('[ReminderModal] Flow error:', error);
        if (mountedRef.current) {
          setPhase('done');
        }
      }
    };

    runFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Handle the voice (or button) response
  // ------------------------------------------------------------------
  const handleVoiceResponse = useCallback(async (response) => {
    const lower = (response || '').toLowerCase();
    const isYes = lower.includes('yes') || lower.includes('yeah') || lower.includes('yep') || lower.includes('done') || lower.includes('completed');
    const isNoResponse = lower === 'no-response' || lower === '';

    let status;
    if (isYes) {
      // Determine if on-time or late based on current time vs endTime
      const now = new Date();
      const [endH, endM] = task.endTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(endH, endM, 0, 0);

      status = now <= endDate ? 'done' : 'late';
    } else {
      status = isNoResponse ? 'missed' : 'missed';
    }

    // Generate + speak the AI response
    const responseMsg = await generateResponseMessage(userName || 'there', task.taskName, status);
    if (!mountedRef.current) return;
    setAiText(responseMsg);
    await speak(responseMsg);

    if (!mountedRef.current) return;
    setPhase('done');

    // Save to backend
    onCompleteRef.current(status, response || 'no-response');
  }, [task, userName, speak, generateResponseMessage]);

  // ------------------------------------------------------------------
  // Manual button handlers (fallback if voice doesn't work)
  // ------------------------------------------------------------------
  const handleManualYes = useCallback(async () => {
    stop(); // stop any in-progress listening
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
  // Visualiser ring color
  // ------------------------------------------------------------------
  const getRingStyles = () => {
    if (phase === 'generating') return 'bg-slate-800 border-slate-600';
    if (phase === 'speaking' || isSpeaking) return 'bg-morning/20 border-morning shadow-[0_0_50px_rgba(59,130,246,0.4)]';
    if (phase === 'listening' || isListening) return 'bg-done/20 border-done shadow-[0_0_50px_rgba(34,197,94,0.4)]';
    if (phase === 'responding') return 'bg-afternoon/20 border-afternoon shadow-[0_0_50px_rgba(249,115,22,0.4)]';
    return 'bg-slate-800 border-slate-600';
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'generating': return 'Generating AI message…';
      case 'speaking': return 'Coach is speaking…';
      case 'listening': return 'Listening for your response…';
      case 'responding': return 'Processing…';
      case 'done': return 'Done!';
      default: return '';
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6">

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors z-10"
        aria-label="Close reminder"
      >
        <X size={24} />
      </button>

      {/* Reminder type badge */}
      <div className="absolute top-6 left-6">
        <span className={`text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider ${
          reminderType === 'followup'
            ? 'bg-afternoon/20 text-afternoon border border-afternoon/30'
            : 'bg-morning/20 text-morning border border-morning/30'
        }`}>
          {reminderType === 'followup' ? '⏰ Follow-up' : '🔔 Reminder'}
        </span>
      </div>

      {/* Task info */}
      <div className="text-center mb-10 mt-12 animate-fade-in-down">
        <h2 className="text-4xl font-bold font-sans text-white mb-2">{task.taskName}</h2>
        <p className="text-xl font-mono text-morning">{task.startTime} – {task.endTime}</p>
      </div>

      {/* Voice visualiser circle */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        <div className={`
          relative flex items-center justify-center w-36 h-36 rounded-full mb-6
          border-4 transition-all duration-500 ${getRingStyles()}
        `}>
          {/* Pulsing ring animations */}
          {(isSpeaking || phase === 'speaking') && (
            <div className="absolute inset-0 rounded-full border-4 border-morning animate-ping opacity-50"></div>
          )}
          {(isListening || phase === 'listening') && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-done animate-pulse"></div>
              <div className="absolute -inset-3 rounded-full border-2 border-done/30 animate-ping opacity-30"></div>
            </>
          )}
          {phase === 'generating' && (
            <Loader2 size={44} className="text-slate-400 animate-spin" />
          )}
          {phase === 'speaking' && (
            <Volume2 size={44} className="text-morning" />
          )}
          {phase === 'listening' && (
            <Mic size={44} className="text-done animate-bounce" />
          )}
          {phase === 'responding' && (
            <Loader2 size={44} className="text-afternoon animate-spin" />
          )}
          {phase === 'done' && (
            <Check size={44} className="text-done" />
          )}
        </div>

        {/* Phase label */}
        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-4">
          {getPhaseLabel()}
        </p>

        {/* AI message text */}
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 w-full min-h-[80px]">
          <p className="text-center text-lg font-sans text-slate-200 leading-relaxed">
            {aiText || message || '…'}
          </p>
        </div>

        {/* STT not supported warning */}
        {!isSTTSupported && phase === 'listening' && (
          <div className="flex items-center gap-2 mt-3 text-late text-sm">
            <MicOff size={16} />
            <span>Voice input not supported in this browser. Use the buttons below.</span>
          </div>
        )}
      </div>

      {/* Action buttons — always visible as fallback */}
      {phase !== 'done' && phase !== 'generating' && (
        <div className="w-full max-w-md mt-8 grid grid-cols-2 gap-4 animate-fade-in-up">
          <button
            onClick={handleManualYes}
            disabled={phase === 'responding'}
            className="flex items-center justify-center py-4 bg-done/20 hover:bg-done/30 active:bg-done/40 border border-done rounded-xl text-done font-bold font-sans transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={24} className="mr-2" /> YES
          </button>
          <button
            onClick={handleManualNo}
            disabled={phase === 'responding'}
            className="flex items-center justify-center py-4 bg-missed/20 hover:bg-missed/30 active:bg-missed/40 border border-missed rounded-xl text-missed font-bold font-sans transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={24} className="mr-2" /> NO
          </button>
        </div>
      )}

    </div>
  );
}
