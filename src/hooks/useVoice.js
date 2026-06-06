import { useState, useCallback } from 'react';
import { speak, listen } from '../services/voiceService';
import { 
  generateReminderMessage, 
  generateFollowUpMessage, 
  generateCompletionResponse, 
  generateMissedResponse 
} from '../services/geminiService';

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stopAll = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsListening(false);
  }, []);

  const runReminderFlow = useCallback(async (task, userName) => {
    const { taskName, startTime, endTime } = task;
    
    console.log(`Starting voice flow for task: ${taskName}`);

    try {
      // 1. Generate reminder message via Gemini
      const reminderMsg = await generateReminderMessage(userName, taskName, startTime, endTime);
      
      // 2. Speak it via TTS
      setIsSpeaking(true);
      await speak(reminderMsg);
      setIsSpeaking(false);
      
      // 3. Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 4. Generate follow-up question
      // Assuming 5 minutes late based on voice flow logic described
      const followUpMsg = await generateFollowUpMessage(userName, taskName, 5);
      
      // 5. Speak follow-up
      setIsSpeaking(true);
      await speak(followUpMsg);
      setIsSpeaking(false);
      
      // 6. Listen for YES/NO (10 sec timeout)
      setIsListening(true);
      const listenResult = await listen({ timeout: 10000 });
      setIsListening(false);
      
      console.log(`User responded: ${listenResult.heard} (raw: "${listenResult.rawText}")`);

      // 7. Based on response, generate + speak response
      if (listenResult.heard === 'yes') {
        const responseMsg = await generateCompletionResponse(userName, taskName, true);
        setIsSpeaking(true);
        await speak(responseMsg);
        setIsSpeaking(false);
      } else if (listenResult.heard === 'no') {
        const responseMsg = await generateMissedResponse(userName, taskName);
        setIsSpeaking(true);
        await speak(responseMsg);
        setIsSpeaking(false);
      } else {
        // Unknown or timeout (no response in 10 min equivalent)
        const responseMsg = `I didn't quite catch that. Please make sure to update your schedule in the app.`;
        setIsSpeaking(true);
        await speak(responseMsg);
        setIsSpeaking(false);
      }

      // 8. Return { response: 'yes'|'no'|'unknown' }
      return { response: listenResult.heard };
      
    } catch (error) {
      console.error("Error in runReminderFlow:", error);
      setIsSpeaking(false);
      setIsListening(false);
      return { response: 'unknown' };
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    runReminderFlow,
    stopAll
  };
};

export default useVoice;
