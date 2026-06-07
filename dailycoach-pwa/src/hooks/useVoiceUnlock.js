import { useState } from 'react';

export function useVoiceUnlock() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Unlock audio context when user taps screen
  const unlockAudio = async () => {
    console.log('🔓 Unlocking audio context...');

    try {
      // 1. Create/resume AudioContext
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext resumed');
      }

      // 2. Prime Web Speech API with silent utterance
      const emptyUtterance = new SpeechSynthesisUtterance('');
      emptyUtterance.volume = 0; // Silent
      window.speechSynthesis.speak(emptyUtterance);
      console.log('Speech synthesis primed');

      // 3. Get available voices (iOS might load them asynchronously)
      const voices = window.speechSynthesis.getVoices();
      console.log('Available voices:', voices.length);
      
      if (voices.length === 0) {
        // On iOS, voices load asynchronously
        window.speechSynthesis.onvoiceschanged = () => {
          console.log('Voices loaded');
        };
      }

      setIsUnlocked(true);
      console.log('✅ Audio context unlocked');
      return true;
    } catch (error) {
      console.error('❌ Failed to unlock audio:', error);
      return false;
    }
  };

  return { isUnlocked, unlockAudio };
}
