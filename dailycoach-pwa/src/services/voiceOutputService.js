/**
 * FIX #4: Text-to-Speech Voice Output Service
 * 
 * Issues Fixed:
 * - Voice takes input but doesn't read output
 * - Task creation has no voice feedback
 * - Generated sentences not being spoken
 * 
 * CREATE NEW FILE: src/services/voiceOutputService.js
 */

/**
 * Text-to-Speech service for voice feedback
 * Uses Web Speech API to speak text back to user
 */

const DEBUG = true;

function log(message, data = null) {
  if (DEBUG) {
    console.log(`[VoiceOutputService] ${message}`, data || '');
  }
}

function logError(message, error) {
  console.error(`[VoiceOutputService] ${message}`, error);
}

// Check browser support for Speech Synthesis
const synth = window.speechSynthesis;
const isSupported = () => {
  return !!synth;
};

/**
 * Speak text using Web Speech API
 * @param {string} text - Text to speak
 * @param {object} options - Optional configuration
 */
export const speak = (text, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Check support
      if (!isSupported()) {
        logError('speak', 'Speech Synthesis API not supported in this browser');
        resolve(false);
        return;
      }

      // Cancel any ongoing speech
      if (synth.speaking) {
        log('Canceling previous speech...');
        synth.cancel();
      }

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);

      // Configure options
      utterance.rate = options.rate || 1.0;      // 0.1 - 2.0
      utterance.pitch = options.pitch || 1.0;    // 0 - 2.0
      utterance.volume = options.volume || 1.0;  // 0 - 1.0
      utterance.lang = options.lang || 'en-US';

      log(`Speaking: "${text}"`, {
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume,
        lang: utterance.lang
      });

      // Handle completion
      utterance.onend = () => {
        log('Speech completed');
        resolve(true);
      };

      // Handle error
      utterance.onerror = (event) => {
        logError('Speech error:', event);
        reject(event.error);
      };

      // Start speaking
      synth.speak(utterance);

    } catch (error) {
      logError('speak failed', error);
      reject(error);
    }
  });
};

/**
 * Speak task creation confirmation
 */
export const speakTaskCreated = async (taskName) => {
  try {
    const text = `Task "${taskName}" has been created successfully. `;
    log(`Speaking confirmation: ${text}`);
    await speak(text, {
      rate: 1.0,
      pitch: 1.1,
      volume: 1.0
    });
  } catch (error) {
    logError('speakTaskCreated failed', error);
  }
};

/**
 * Speak task completed confirmation
 */
export const speakTaskCompleted = async (taskName) => {
  try {
    const text = `Great job! You completed "${taskName}".`;
    log(`Speaking: ${text}`);
    await speak(text, {
      rate: 1.0,
      pitch: 1.2,
      volume: 1.0
    });
  } catch (error) {
    logError('speakTaskCompleted failed', error);
  }
};

/**
 * Speak reminder notification
 */
export const speakReminder = async (taskName) => {
  try {
    const text = `Time for your task: ${taskName}. Please respond.`;
    log(`Speaking reminder: ${text}`);
    await speak(text, {
      rate: 0.9,
      pitch: 1.0,
      volume: 1.0
    });
  } catch (error) {
    logError('speakReminder failed', error);
  }
};

/**
 * Speak Gemini generated response
 */
export const speakGeminiResponse = async (responseText) => {
  try {
    log(`Speaking Gemini response: ${responseText.substring(0, 50)}...`);
    await speak(responseText, {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    });
  } catch (error) {
    logError('speakGeminiResponse failed', error);
  }
};

/**
 * Stop current speech
 */
export const stopSpeaking = () => {
  if (isSupported() && synth.speaking) {
    log('Stopping speech');
    synth.cancel();
  }
};

/**
 * Pause current speech
 */
export const pauseSpeech = () => {
  if (isSupported() && synth.speaking) {
    log('Pausing speech');
    synth.pause();
  }
};

/**
 * Resume paused speech
 */
export const resumeSpeech = () => {
  if (isSupported() && synth.paused) {
    log('Resuming speech');
    synth.resume();
  }
};

/**
 * Check if speech is currently playing
 */
export const isSpeaking = () => {
  return isSupported() && synth.speaking;
};

/**
 * Get available voices
 */
export const getAvailableVoices = () => {
  if (!isSupported()) {
    return [];
  }
  return synth.getVoices();
};

/**
 * Set specific voice by name
 */
export const setVoiceByName = (voiceName) => {
  const voices = getAvailableVoices();
  const voice = voices.find(v => v.name === voiceName);
  return voice || null;
};

/**
 * Test speech synthesis
 */
export const testSpeech = async () => {
  try {
    log('Testing speech synthesis...');
    await speak('Hello! This is a test of the text to speech system.', {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    });
    log('✅ Speech test completed');
  } catch (error) {
    logError('testSpeech failed', error);
  }
};

export default {
  speak,
  speakTaskCreated,
  speakTaskCompleted,
  speakReminder,
  speakGeminiResponse,
  stopSpeaking,
  pauseSpeech,
  resumeSpeech,
  isSpeaking,
  getAvailableVoices,
  setVoiceByName,
  testSpeech,
  isSupported
};
