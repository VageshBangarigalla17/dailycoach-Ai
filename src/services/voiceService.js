export const isVoiceSupported = () => {
  const tts = 'speechSynthesis' in window;
  const stt = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  return { tts, stt };
};

export const getAvailableVoices = () => {
  if (!('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  
  // Sort preferred voices to the top
  return voices.sort((a, b) => {
    const isAPreferred = a.name.includes("Google India English") || a.name.includes("Google UK English Female");
    const isBPreferred = b.name.includes("Google India English") || b.name.includes("Google UK English Female");
    
    if (isAPreferred && !isBPreferred) return -1;
    if (!isAPreferred && isBPreferred) return 1;
    return 0;
  });
};

export const speak = (text, options = {}) => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn("Speech synthesis not supported in this browser.");
      resolve();
      return;
    }

    const { rate = 1.0, pitch = 1.0, volume = 1.0, voiceName = null } = options;
    const synth = window.speechSynthesis;

    // Cancel any current speech before starting new one
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    const voices = synth.getVoices();
    if (voiceName) {
      const selectedVoice = voices.find(v => v.name === voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else {
      // Prefer: Google India English, Google UK English Female
      const preferredVoice = voices.find(v => 
        v.name.includes("Google India English") || 
        v.name.includes("Google UK English Female")
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      // Resolve anyway so the flow doesn't break
      resolve();
    };

    synth.speak(utterance);
  });
};

export const listen = (options = {}) => {
  return new Promise((resolve) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      resolve({ heard: 'unknown', rawText: '', confidence: 0 });
      return;
    }

    const { timeout = 10000, language = 'en-IN' } = options;
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    
    let isResolved = false;

    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        recognition.stop();
        resolve({ heard: 'unknown', rawText: '', confidence: 0 });
      }
    }, timeout);

    recognition.onresult = (event) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);

      const rawText = event.results[0][0].transcript.trim().toLowerCase();
      const confidence = event.results[0][0].confidence;

      console.log(`Speech recognized: "${rawText}" (confidence: ${confidence})`);

      const yesWords = ["yes", "yeah", "yep", "done", "completed", "haan", "ha", "ha ji"];
      const noWords = ["no", "nope", "not yet", "nahi", "na"];

      let heard = 'unknown';

      // Ensure we match whole words to avoid partial matches
      const words = rawText.split(/\s+/);
      
      const hasYes = yesWords.some(yesWord => rawText.includes(yesWord));
      const hasNo = noWords.some(noWord => rawText.includes(noWord));

      if (hasYes && !hasNo) {
        heard = 'yes';
      } else if (hasNo && !hasYes) {
        heard = 'no';
      } else if (hasYes && hasNo) {
        // If both present, maybe just check the first word or default unknown
        heard = 'unknown';
      }

      resolve({ heard, rawText, confidence });
    };

    recognition.onerror = (event) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);
      console.error("Speech recognition error:", event.error);
      resolve({ heard: 'unknown', rawText: '', confidence: 0 });
    };

    recognition.onend = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        resolve({ heard: 'unknown', rawText: '', confidence: 0 });
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        resolve({ heard: 'unknown', rawText: '', confidence: 0 });
      }
    }
  });
};
