import { GoogleGenerativeAI } from '@google/generative-ai';

const getModel = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is not set in environment variables.");
  }
  const genAI = new GoogleGenerativeAI(apiKey || 'missing-key');
  return genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
};

export const generateReminderMessage = async (userName, taskName, startTime, endTime) => {
  const prompt = `You are DailyCoach, a warm and motivating personal life coach AI.
Generate a friendly reminder message for ${userName} that their 
${taskName} starts now at ${startTime} and ends at ${endTime}.
Keep it under 2 sentences. Sound like a caring friend.
Use their name naturally. Be encouraging.`;

  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error in generateReminderMessage:", error);
    return `Hey ${userName}, it's time for ${taskName}! You've got this.`;
  }
};

export const generateFollowUpMessage = async (userName, taskName, minutesLate) => {
  const prompt = `Generate a gentle follow-up for ${userName} asking if 
they completed their ${taskName} which was due ${minutesLate} 
minutes ago. Ask as a yes or no question. Keep it short.`;

  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error in generateFollowUpMessage:", error);
    return `Hey ${userName}, just checking in. Did you manage to complete ${taskName}?`;
  }
};

export const generateCompletionResponse = async (userName, taskName, isOnTime) => {
  const prompt = isOnTime 
    ? `Generate warm congratulations for ${userName} 
completing ${taskName} on time. 1 sentence, enthusiastic.`
    : `Generate a positive but honest response for ${userName} 
who completed ${taskName} late. Acknowledge the delay but 
still encourage. 1 sentence.`;

  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error in generateCompletionResponse:", error);
    return isOnTime 
      ? `Awesome job, ${userName}! Keep up the great work with ${taskName}.`
      : `Good job getting ${taskName} done, ${userName}, even if it was a bit late. Better late than never!`;
  }
};

export const generateMissedResponse = async (userName, taskName) => {
  const prompt = `Generate a firm but caring response for ${userName} 
who missed their ${taskName}. Encourage them to do it now 
if possible. 1-2 sentences.`;

  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error in generateMissedResponse:", error);
    return `Hey ${userName}, looks like you missed ${taskName}. It's okay, but try to get to it as soon as you can!`;
  }
};

export const generateDailySummary = async (userName, stats) => {
  const { total, completed, late, missed, percentage } = stats;
  const prompt = `Generate a personalized daily summary for ${userName}.
Stats: completed ${completed}/${total} tasks on time, 
${late} late, ${missed} missed (${percentage}% success rate).
Be honest but motivating. 2-3 sentences.`;

  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error in generateDailySummary:", error);
    return `Here is your daily summary, ${userName}: You completed ${completed} out of ${total} tasks, with a ${percentage}% success rate. Keep pushing forward!`;
  }
};
