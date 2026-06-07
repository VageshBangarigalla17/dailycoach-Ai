/**
 * useVoice.js
 *
 * React hook that wraps voiceService (real Web Speech API) and
 * geminiService (AI message generation) into a single, easy-to-use
 * interface for the ReminderModal.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as voice from '../services/voiceService';
import * as gemini from '../services/geminiService';

export function useVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState('');
  const [voiceError, setVoiceError] = useState(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      voice.stopAll();
    };
  }, []);

  /**
   * Play a short beep to unlock audio context (must be called from user gesture on mobile).
   */
  const playBeep = useCallback(async () => {
    try {
      await voice.playBeep(150, 440);
    } catch (error) {
      console.warn('[useVoice] playBeep failed:', error);
    }
  }, []);

  /**
   * Speak text aloud using the real Web Speech API TTS.
   * Updates isSpeaking / message state while active.
   */
  const speak = useCallback(async (text, options = {}) => {
    try {
      if (!mountedRef.current) return;
      setMessage(text);
      setIsSpeaking(true);
      setVoiceError(null);
      console.log('[useVoice] Speaking:', text.substring(0, 60));
      await voice.speak(text, options);
    } catch (error) {
      console.error('[useVoice] speak error:', error);
      if (mountedRef.current) {
        setVoiceError('Voice playback failed. Using text display instead.');
      }
    } finally {
      if (mountedRef.current) {
        setIsSpeaking(false);
      }
    }
  }, []);

  /**
   * Listen for voice input using the real Web Speech API STT.
   * Returns the transcribed text, or 'no-response' after timeout.
   */
  const listen = useCallback(async (timeout = 10000) => {
    try {
      if (!mountedRef.current) return 'no-response';
      setIsListening(true);
      setMessage('Listening… say YES or NO');
      setVoiceError(null);
      console.log('[useVoice] Listening started, timeout:', timeout);
      const transcript = await voice.listen({ timeout });
      if (mountedRef.current) {
        setMessage(transcript === 'no-response' ? 'No response heard.' : `You said: "${transcript}"`);
      }
      return transcript;
    } catch (error) {
      console.error('[useVoice] listen error:', error);
      if (mountedRef.current) {
        setVoiceError('Microphone not available. Please use the buttons.');
      }
      return 'no-response';
    } finally {
      if (mountedRef.current) {
        setIsListening(false);
      }
    }
  }, []);

  /**
   * Stop any in-progress TTS or STT immediately.
   */
  const stop = useCallback(() => {
    voice.stopAll();
    setIsSpeaking(false);
    setIsListening(false);
  }, []);

  /**
   * Generate an AI start-reminder message via Gemini (with fallback).
   */
  const generateStartMessage = useCallback(async (userName, taskName, startTime, endTime) => {
    try {
      const msg = await gemini.generateStartMessage(userName, taskName, startTime, endTime);
      return msg;
    } catch (error) {
      console.error('[useVoice] generateStartMessage error:', error);
      return `Hey ${userName}! It's ${startTime}. Time for ${taskName}. Are you ready to start? Say OK or YES.`;
    }
  }, []);

  /**
   * Generate an AI second-chance message via Gemini (with fallback).
   */
  const generateSecondChanceMessage = useCallback(async (userName, taskName) => {
    try {
      const msg = await gemini.generateSecondChanceMessage(userName, taskName);
      return msg;
    } catch (error) {
      console.error('[useVoice] generateSecondChanceMessage error:', error);
      return `Hey ${userName}! I'm checking in again on ${taskName}. Have you completed it now? Say YES or NO.`;
    }
  }, []);

  /**
   * Generate an AI follow-up message via Gemini (with fallback).
   */
  const generateFollowupMessage = useCallback(async (userName, taskName, endTime) => {
    try {
      const msg = await gemini.generateFollowupMessage(userName, taskName, endTime);
      return msg;
    } catch (error) {
      console.error('[useVoice] generateFollowupMessage error:', error);
      return `Hey ${userName}! Your ${taskName} time just ended at ${endTime}. Did you complete it? Say YES or NO.`;
    }
  }, []);

  /**
   * Generate an AI response message (after user confirms/denies).
   */
  const generateResponseMessage = useCallback(async (userName, taskName, status) => {
    try {
      const msg = await gemini.generateResponseMessage(userName, taskName, status);
      return msg;
    } catch (error) {
      console.error('[useVoice] generateResponseMessage error:', error);
      return status === 'done' || status === 'late'
        ? `Great job, ${userName}! ${taskName} marked as ${status === 'late' ? 'completed late' : 'done'}!`
        : `No worries, ${userName}. I'll mark ${taskName} as missed for now.`;
    }
  }, []);

  return {
    isSpeaking,
    isListening,
    message,
    voiceError,
    speak,
    listen,
    stop,
    generateStartMessage,
    generateFollowupMessage,
    generateSecondChanceMessage,
    generateResponseMessage,
    playBeep,
    isTTSSupported: voice.isTTSSupported(),
    isSTTSupported: voice.isSTTSupported(),
  };
}
