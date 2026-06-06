/**
 * geminiService.js
 *
 * Generates human-like AI coach messages using the Google Gemini API.
 * Falls back to pre-written templates when Gemini is unavailable or slow.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ---------------------------------------------------------------------------
// Gemini client setup
// ---------------------------------------------------------------------------

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let genAI = null;
let model = null;

try {
  if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('[geminiService] Gemini client initialised.');
  } else {
    console.warn('[geminiService] VITE_GEMINI_API_KEY not set — using fallback messages only.');
  }
} catch (error) {
  console.error('[geminiService] Failed to initialise Gemini client:', error);
}


// ---------------------------------------------------------------------------
// Fallback message templates (used when Gemini is unavailable)
// ---------------------------------------------------------------------------

const FALLBACK_START = (name, taskName, startTime, endTime) =>
  `Hey ${name}! It's ${startTime}. Time for ${taskName}. You have until ${endTime}. Don't skip it!`;

const FALLBACK_FOLLOWUP = (name, taskName, endTime) =>
  `Hey ${name}! Your ${taskName} time just ended at ${endTime}. Did you complete it? Say YES or NO.`;

const FALLBACK_DONE_ONTIME = (name, taskName) =>
  `Great job, ${name}! ${taskName} marked as done, right on time! Keep up this amazing streak!`;

const FALLBACK_DONE_LATE = (name, taskName) =>
  `Good that you finished ${taskName}, ${name}! It was a little late, but completing it still counts. Try to be on time next!`;

const FALLBACK_MISSED = (name, taskName) =>
  `${name}, you missed ${taskName} today. Don't let it become a habit! Tomorrow is a fresh start. You've got this!`;

const FALLBACK_NO_RESPONSE = (name, taskName) =>
  `${name}, I didn't hear you. I'll mark ${taskName} as missed for now. You can update it later if you did complete it.`;


// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildStartPrompt(name, taskName, startTime, endTime) {
  return `You are a personal AI life coach named DailyCoach. Speak directly to ${name} in a warm, encouraging, human voice — as if you're their close friend. Keep it SHORT (2-3 sentences max). It's ${startTime} now. Their task "${taskName}" is starting. It ends at ${endTime}. Remind them to start NOW and be motivating. Do NOT use markdown, emojis, or bullet points — just plain conversational speech.`;
}

function buildFollowupPrompt(name, taskName, endTime) {
  return `You are a personal AI life coach named DailyCoach. Speak directly to ${name} like their close friend. Keep it SHORT (2-3 sentences max). Their task "${taskName}" window just ended at ${endTime}. Ask them if they completed it. Tell them to say YES or NO. Be warm but firm. Do NOT use markdown, emojis, or bullet points — just plain conversational speech.`;
}

function buildResponsePrompt(name, taskName, status) {
  const statusDesc = {
    done: `${name} completed "${taskName}" on time`,
    late: `${name} completed "${taskName}" but late`,
    missed: `${name} did NOT complete "${taskName}"`,
    'no-response': `${name} did not respond about "${taskName}"`
  };

  return `You are a personal AI life coach named DailyCoach. Speak directly to ${name} like their close friend. Keep it SHORT (1-2 sentences max). ${statusDesc[status] || statusDesc['missed']}. Give a brief reaction — congratulate if done, gently encourage if missed. Do NOT use markdown, emojis, or bullet points — just plain conversational speech.`;
}


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a START reminder message for a task.
 * @returns {Promise<string>}
 */
export async function generateStartMessage(name, taskName, startTime, endTime) {
  const fallback = FALLBACK_START(name, taskName, startTime, endTime);
  return callGemini(buildStartPrompt(name, taskName, startTime, endTime), fallback);
}

/**
 * Generate a FOLLOW-UP message at the end of a task window.
 * @returns {Promise<string>}
 */
export async function generateFollowupMessage(name, taskName, endTime) {
  const fallback = FALLBACK_FOLLOWUP(name, taskName, endTime);
  return callGemini(buildFollowupPrompt(name, taskName, endTime), fallback);
}

/**
 * Generate a RESPONSE message after the user confirms/denies completion.
 * @param {'done'|'late'|'missed'|'no-response'} status
 * @returns {Promise<string>}
 */
export async function generateResponseMessage(name, taskName, status) {
  let fallback;
  switch (status) {
    case 'done':
      fallback = FALLBACK_DONE_ONTIME(name, taskName);
      break;
    case 'late':
      fallback = FALLBACK_DONE_LATE(name, taskName);
      break;
    case 'missed':
      fallback = FALLBACK_MISSED(name, taskName);
      break;
    default:
      fallback = FALLBACK_NO_RESPONSE(name, taskName);
  }
  return callGemini(buildResponsePrompt(name, taskName, status), fallback);
}


// ---------------------------------------------------------------------------
// Internal: call Gemini with a timeout, fall back on failure
// ---------------------------------------------------------------------------

const GEMINI_TIMEOUT_MS = 5000;

async function callGemini(prompt, fallback) {
  if (!model) {
    console.log('[geminiService] No model available — using fallback.');
    return fallback;
  }

  try {
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), GEMINI_TIMEOUT_MS)
      )
    ]);

    const text = result.response?.text?.() || '';
    if (text.trim().length > 0) {
      console.log('[geminiService] Gemini response:', text.trim().substring(0, 80) + '…');
      return text.trim();
    }

    console.warn('[geminiService] Empty Gemini response — using fallback.');
    return fallback;

  } catch (error) {
    console.error('[geminiService] Gemini call failed:', error.message);
    return fallback;
  }
}
