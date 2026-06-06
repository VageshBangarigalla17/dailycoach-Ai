/**
 * voiceService.js
 * 
 * Real Web Speech API wrapper for text-to-speech (TTS) and
 * speech-to-text (STT). Falls back gracefully when APIs are
 * unavailable (e.g. Firefox STT).
 */

// ---------------------------------------------------------------------------
// TTS — Text-to-Speech via window.speechSynthesis
// ---------------------------------------------------------------------------

let currentUtterance = null;

/**
 * Speak text aloud using the browser's built-in speech synthesis.
 * Resolves when the utterance finishes, rejects on error.
 *
 * @param {string} text - The text to speak.
 * @param {object} [options] - Optional config.
 * @param {number} [options.rate=1]   - Speech rate (0.1 – 10).
 * @param {number} [options.pitch=1]  - Pitch (0 – 2).
 * @param {string} [options.lang='en-IN'] - BCP-47 language tag.
 * @returns {Promise<void>}
 */
export function speak(text, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      if (!('speechSynthesis' in window)) {
        console.warn('[voiceService] speechSynthesis not supported — skipping TTS.');
        resolve();
        return;
      }

      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.lang = options.lang ?? 'en-IN';
      utterance.volume = 1;

      // Try to pick a good voice (prefer English-India or English-US)
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang === 'en-IN' || v.lang === 'en-US'
      );
      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onend = () => {
        console.log('[voiceService] TTS finished.');
        currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        // 'interrupted' and 'canceled' are expected when we call stop()
        if (event.error === 'interrupted' || event.error === 'canceled') {
          console.log('[voiceService] TTS interrupted/canceled.');
          currentUtterance = null;
          resolve();
          return;
        }
        console.error('[voiceService] TTS error:', event.error);
        currentUtterance = null;
        reject(new Error(`TTS error: ${event.error}`));
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      console.log('[voiceService] TTS started:', text.substring(0, 60) + '…');

      // Chrome bug workaround: speechSynthesis pauses after ~15s.
      // Keep it alive by resuming periodically.
      const keepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(keepAlive);
        }
      }, 10000);

      utterance.onend = () => {
        clearInterval(keepAlive);
        currentUtterance = null;
        resolve();
      };

    } catch (error) {
      console.error('[voiceService] speak() exception:', error);
      resolve(); // don't block the flow
    }
  });
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
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognitionInstance = recognition;

      let settled = false;
      const settle = (value) => {
        if (settled) return;
        settled = true;
        recognitionInstance = null;
        clearTimeout(timer);
        try { recognition.stop(); } catch (_) { /* already stopped */ }
        resolve(value);
      };

      // Timeout: auto-resolve after N seconds of silence
      const timer = setTimeout(() => {
        console.log(`[voiceService] STT timeout (${timeout}ms) — no-response`);
        settle('no-response');
      }, timeout);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        console.log('[voiceService] STT result:', transcript);
        settle(transcript);
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          console.log('[voiceService] STT ended with:', event.error);
          settle('no-response');
          return;
        }
        console.error('[voiceService] STT error:', event.error);
        settle('no-response');
      };

      recognition.onend = () => {
        // If not yet settled, treat as no-response
        settle('no-response');
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
