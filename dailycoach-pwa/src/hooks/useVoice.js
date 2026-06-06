import { useState, useEffect } from 'react';

export function useVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState('');

  // Mock implementation for UI demonstration
  const speak = (text) => {
    return new Promise((resolve) => {
      setMessage(text);
      setIsSpeaking(true);
      setTimeout(() => {
        setIsSpeaking(false);
        resolve();
      }, 3000); // simulate 3 seconds of speaking
    });
  };

  const listen = () => {
    return new Promise((resolve) => {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        resolve('yes'); // always mock returning yes after 3 seconds
      }, 3000);
    });
  };

  const stop = () => {
    setIsSpeaking(false);
    setIsListening(false);
  };

  return {
    isSpeaking,
    isListening,
    message,
    speak,
    listen,
    stop
  };
}
