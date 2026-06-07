/**
 * voiceService.js
 *
 * Production Web Speech API wrapper for text-to-speech (TTS) and
 * speech-to-text (STT). Handles Chrome voice-loading race condition,
 * mobile keep-alive bug, audio context unlock, and graceful fallbacks.
 */

// ---------------------------------------------------------------------------
// Audio Context — for unlocking audio + beep generation
// ---------------------------------------------------------------------------

let audioCtx = null;

/**
 * Get or create the shared AudioContext.
 * Must be called from a user gesture on mobile to unlock audio.
 */
function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        console.log('[voiceService] AudioContext created, state:', audioCtx.state);
      }
    } catch (e) {
      console.warn('[voiceService] Failed to create AudioContext:', e);
    }
  }
  return audioCtx;
}

/**
 * Play a short beep tone to unlock the audio context.
 * This MUST be called from a user gesture (click/tap) on mobile browsers
 * to unlock both AudioContext and speechSynthesis.
 *
 * @param {number} [durationMs=150] - Duration of beep in milliseconds.
 * @param {number} [frequency=440] - Frequency in Hz (440 = A4).
 * @returns {Promise<void>}
 */
export function playBeep(durationMs = 150, frequency = 440) {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      // Resume context if suspended (required on mobile after user gesture)
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('[voiceService] AudioContext resumed.');
        }).catch(() => {});
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Soft volume so it's a gentle "ding" not a harsh beep
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + durationMs / 1000);

      oscillator.onended = () => {
        console.log('[voiceService] Beep played (audio unlocked).');
        resolve();
      };

      // Safety timeout
      setTimeout(resolve, durationMs + 100);
    } catch (error) {
      console.warn('[voiceService] playBeep failed:', error);
      resolve();
    }
  });
}


// ---------------------------------------------------------------------------
// Voice Loading — Chrome loads voices ASYNC, must wait for them
// ---------------------------------------------------------------------------

let voicesLoaded = false;
let voicesPromise = null;

/**
 * Wait for browser voices to be loaded. Chrome fires
 * 'voiceschanged' event asynchronously — if we try to speak
 * before voices are loaded, we get SILENT audio.
 */
function ensureVoicesLoaded() {
  if (voicesLoaded) return Promise.resolve();
  if (voicesPromise) return voicesPromise;

  voicesPromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();

    // Voices already available (Firefox, some Chromium builds)
    if (voices.length > 0) {
      voicesLoaded = true;
      console.log(`[voiceService] ${voices.length} voices already loaded.`);
      resolve();
      return;
    }

    // Chrome: wait for the voiceschanged event
    const onVoicesChanged = () => {
      voicesLoaded = true;
      const loadedVoices = synth.getVoices();
      console.log(`[voiceService] ${loadedVoices.length} voices loaded via event.`);
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      resolve();
    };
    synth.addEventListener('voiceschanged', onVoicesChanged);

    // Safety timeout — don't block forever if event never fires
    setTimeout(() => {
      if (!voicesLoaded) {
        voicesLoaded = true;
        console.warn('[voiceService] Voice loading timed out (2s), proceeding with defaults.');
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        resolve();
      }
    }, 2000);
  });

  return voicesPromise;
}

// Kick off voice loading immediately on module import
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  ensureVoicesLoaded();
}


// ---------------------------------------------------------------------------
// TTS — Text-to-Speech via window.speechSynthesis
// ---------------------------------------------------------------------------

let currentUtterance = null;
let keepAliveTimer = null;

/**
 * Pick the best available voice for English speech.
 * Priority: Google en-IN > Google en-US > en-IN female > en-IN any > en-US female > en-US > en-GB > default
 *
 * Google voices (on Chrome) sound significantly more natural than system voices.
 */
function pickBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Priority list — Google voices first (they sound most human-like)
  const priorities = [
    (v) => v.name.includes('Google') && v.lang === 'en-IN',
    (v) => v.name.includes('Google') && v.lang === 'en-US' && v.name.toLowerCase().includes('female'),
    (v) => v.name.includes('Google') && v.lang === 'en-US',
    (v) => v.name.includes('Google') && v.lang.startsWith('en'),
    (v) => v.lang === 'en-IN' && v.name.toLowerCase().includes('female'),
    (v) => v.lang === 'en-IN',
    (v) => v.lang.startsWith('en-IN'),
    (v) => v.lang === 'en-US' && v.name.toLowerCase().includes('female'),
    (v) => v.lang === 'en-US',
    (v) => v.lang === 'en-GB',
    (v) => v.lang.startsWith('en'),
  ];

  for (const predicate of priorities) {
    const match = voices.find(predicate);
    if (match) {
      console.log(`[voiceService] Selected voice: "${match.name}" (${match.lang})`);
      return match;
    }
  }

  console.log(`[voiceService] Using default voice: "${voices[0].name}"`);
  return voices[0];
}


/**
 * Speak text aloud using the browser's built-in speech synthesis.
 * Resolves when the utterance finishes or is cancelled.
 *
 * @param {string} text - The text to speak.
 * @param {object} [options] - Optional config.
 * @param {number} [options.rate=0.95]   - Speech rate (0.1–10). Slightly slower = more natural.
 * @param {number} [options.pitch=1]     - Pitch (0–2).
 * @param {string} [options.lang='en-IN'] - BCP-47 language tag.
 * @returns {Promise<void>}
 */
export function speak(text, options = {}) {
  return new Promise((resolve) => {
    try {
      if (!('speechSynthesis' in window)) {
        console.warn('[voiceService] speechSynthesis not supported — skipping TTS.');
        resolve();
        return;
      }

      // Wait for voices to be ready, then speak
      ensureVoicesLoaded().then(() => {
        // Cancel any ongoing speech first
        window.speechSynthesis.cancel();
        clearKeepAlive();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate ?? 0.95;
        utterance.pitch = options.pitch ?? 1;
        utterance.lang = options.lang ?? 'en-IN';
        utterance.volume = 1;

        // Assign the best available voice
        const voice = pickBestVoice();
        if (voice) {
          utterance.voice = voice;
        }

        // Single onend handler — no duplicates
        utterance.onend = () => {
          console.log('[voiceService] TTS finished.');
          clearKeepAlive();
          currentUtterance = null;
          resolve();
        };

        utterance.onerror = (event) => {
          // 'interrupted' and 'canceled' are expected when we call stop()
          if (event.error === 'interrupted' || event.error === 'canceled') {
            console.log('[voiceService] TTS interrupted/canceled.');
          } else {
            console.error('[voiceService] TTS error:', event.error);
          }
          clearKeepAlive();
          currentUtterance = null;
          resolve(); // always resolve — never block the flow
        };

        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
        console.log('[voiceService] TTS started:', text.substring(0, 80));

        // Chrome bug workaround: speechSynthesis pauses after ~15s on desktop.
        // Resume it periodically. BUT only start this AFTER a delay so we don't
        // kill short utterances on mobile.
        keepAliveTimer = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearKeepAlive();
          }
        }, 12000);

        // Safety timeout: if onend never fires (rare edge case), resolve after 30s
        setTimeout(() => {
          if (currentUtterance === utterance) {
            console.warn('[voiceService] TTS safety timeout — forcing resolve.');
            clearKeepAlive();
            currentUtterance = null;
            resolve();
          }
        }, 30000);
      });

    } catch (error) {
      console.error('[voiceService] speak() exception:', error);
      resolve(); // don't block the flow
    }
  });
}

function clearKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}


// ---------------------------------------------------------------------------
// STT — Speech-to-Text via SpeechRecognition
// ---------------------------------------------------------------------------

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

let recognitionInstance = null;

/**
 * Listen for speech from the microphone.
 * Returns the transcript string, or 'no-response' on timeout/silence.
 *
 * @param {object} [options]
 * @param {number} [options.timeout=10000]  - Max listening time in ms.
 * @param {string} [options.lang='en-IN']   - Recognition language.
 * @returns {Promise<string>} The recognised transcript or 'no-response'.
 */
export function listen(options = {}) {
  return new Promise((resolve) => {
    try {
      if (!SpeechRecognition) {
        console.warn('[voiceService] SpeechRecognition not supported — returning no-response.');
        resolve('no-response');
        return;
      }

      const timeout = options.timeout ?? 10000;
      const lang = options.lang ?? 'en-IN';

      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      recognition.continuous = false;

      recognitionInstance = recognition;

      let settled = false;
      let timer = null;

      const settle = (value) => {
        if (settled) return;
        settled = true;
        recognitionInstance = null;
        clearTimeout(timer);
        try { recognition.stop(); } catch (_) { /* already stopped */ }
        resolve(value);
      };

      // Timeout: auto-resolve after N seconds of silence
      timer = setTimeout(() => {
        console.log(`[voiceService] STT timeout (${timeout}ms) — no-response`);
        settle('no-response');
      }, timeout);

      recognition.onresult = (event) => {
        // Check all alternatives for yes/no keywords
        let bestTranscript = '';
        for (let i = 0; i < event.results[0].length; i++) {
          const alt = event.results[0][i].transcript.trim().toLowerCase();
          if (alt.includes('yes') || alt.includes('no')) {
            bestTranscript = alt;
            break;
          }
          if (!bestTranscript) bestTranscript = alt;
        }
        console.log('[voiceService] STT result:', bestTranscript);
        settle(bestTranscript);
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          console.log('[voiceService] STT ended with:', event.error);
        } else if (event.error === 'not-allowed') {
          console.error('[voiceService] Microphone permission denied!');
          settle('no-response');
          return;
        } else {
          console.error('[voiceService] STT error:', event.error);
        }
        // Don't settle immediately for minor errors like 'no-speech' if we're doing continuous loop
      };

      recognition.onend = () => {
        // If not yet settled, automatically restart it because Chrome stops listening on silence!
        if (!settled) {
          console.log('[voiceService] STT onend fired prematurely. Restarting to fulfill timeout...');
          try {
            recognition.start();
          } catch (e) {
            console.error('[voiceService] Failed to restart STT:', e);
            settle('no-response');
          }
        }
      };

      recognition.start();
      console.log('[voiceService] STT listening started…');

    } catch (error) {
      console.error('[voiceService] listen() exception:', error);
      resolve('no-response');
    }
  });
}


// ---------------------------------------------------------------------------
// Stop — cancel any active TTS or STT
// ---------------------------------------------------------------------------

/**
 * Immediately stop any in-progress TTS or STT session.
 */
export function stopAll() {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    clearKeepAlive();
    currentUtterance = null;
  } catch (e) {
    console.error('[voiceService] Error stopping TTS:', e);
  }

  try {
    if (recognitionInstance) {
      recognitionInstance.abort();
      recognitionInstance = null;
    }
  } catch (e) {
    console.error('[voiceService] Error stopping STT:', e);
  }
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the browser supports TTS.
 */
export function isTTSSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Returns true if the browser supports STT.
 */
export function isSTTSupported() {
  return !!SpeechRecognition;
}
