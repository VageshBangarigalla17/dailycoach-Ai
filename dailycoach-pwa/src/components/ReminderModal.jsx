import React, { useEffect, useState } from 'react';
import { Mic, Check, X, Loader2 } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';

export default function ReminderModal({ task, userName, onComplete, onClose }) {
  const { isSpeaking, isListening, message, speak, listen, stop } = useVoice();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const runFlow = async () => {
      // 1. Simulate AI message generation
      setLoading(true);
      await new Promise(r => setTimeout(r, 1000));
      if (!mounted) return;
      setLoading(false);

      // 2. Speak greeting and reminder
      await speak(`Hi ${userName || 'there'}. It's time for ${task.taskName}. Have you completed it?`);
      if (!mounted) return;

      // 3. Listen for response
      const response = await listen();
      if (!mounted) return;

      if (response && response.toLowerCase().includes('yes')) {
        await speak('Great job! Keep up the good work.');
        onComplete('done');
      } else {
        await speak('No problem. I will mark it as missed for now. You can do it!');
        onComplete('missed');
      }
    };

    runFlow();

    return () => {
      mounted = false;
      stop();
    };
  }, [task, userName, onComplete, speak, listen, stop]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6">
      
      {/* Top section: Task Info */}
      <div className="text-center mb-12 animate-fade-in-down">
        <h2 className="text-4xl font-bold font-sans text-white mb-2">{task.taskName}</h2>
        <p className="text-xl font-mono text-morning">{task.startTime} - {task.endTime}</p>
      </div>

      {/* Middle section: Voice visualization & Message */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        
        {loading ? (
          <div className="flex flex-col items-center text-slate-400">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="font-sans">Generating AI message...</p>
          </div>
        ) : (
          <>
            {/* Visualizer Circle */}
            <div className={`
              relative flex items-center justify-center w-32 h-32 rounded-full mb-8 transition-all duration-300
              ${isSpeaking ? 'bg-morning/20 shadow-[0_0_40px_rgba(59,130,246,0.5)]' : ''}
              ${isListening ? 'bg-done/20 shadow-[0_0_40px_rgba(34,197,94,0.5)]' : ''}
              ${!isSpeaking && !isListening ? 'bg-slate-800' : ''}
            `}>
              {isSpeaking && (
                <div className="absolute inset-0 rounded-full border-4 border-morning animate-ping opacity-75"></div>
              )}
              {isListening && (
                <div className="absolute inset-0 rounded-full border-4 border-done animate-pulse"></div>
              )}
              
              <Mic size={40} className={`
                ${isSpeaking ? 'text-morning' : ''}
                ${isListening ? 'text-done animate-bounce' : ''}
                ${!isSpeaking && !isListening ? 'text-slate-500' : ''}
              `} />
            </div>

            {/* AI Text output */}
            <p className="text-center text-lg font-sans text-slate-300 min-h-[3rem] px-4">
              {message || (isListening ? 'Listening...' : '')}
            </p>
          </>
        )}
      </div>

      {/* Bottom section: Fallback Buttons */}
      <div className="w-full max-w-md mt-auto grid grid-cols-2 gap-4 animate-fade-in-up">
        <button
          onClick={() => onComplete('done')}
          className="flex items-center justify-center py-4 bg-done/20 hover:bg-done/30 border border-done rounded-xl text-done font-bold font-sans transition-colors"
        >
          <Check size={24} className="mr-2" /> YES
        </button>
        <button
          onClick={() => onComplete('missed')}
          className="flex items-center justify-center py-4 bg-missed/20 hover:bg-missed/30 border border-missed rounded-xl text-missed font-bold font-sans transition-colors"
        >
          <X size={24} className="mr-2" /> NO
        </button>
      </div>
      
      {/* Close button (top right) */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>

    </div>
  );
}
