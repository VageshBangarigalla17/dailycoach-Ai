import React, { useState } from 'react';
import { ShieldAlert, ChevronRight } from 'lucide-react';
import { registerPlugin } from '@capacitor/core';

const NotificationService = registerPlugin('NotificationService');

export default function BatteryOptimizationSection() {
  const [status, setStatus] = useState('');

  const handleRequestOptimization = async () => {
    try {
      if (window.Capacitor?.isNativePlatform()) {
        const result = await NotificationService.requestBatteryOptimizationExemption();
        setStatus(result.message);
      } else {
        setStatus("Not running on a native Android device.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Failed to open settings. Please open Android settings manually.");
    }
  };

  return (
    <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 mt-6">
      <div className="flex items-center mb-4">
        <ShieldAlert className="text-yellow-500 mr-3" size={24} />
        <div>
          <h3 className="text-lg font-bold text-white">Background Reliability</h3>
          <p className="text-xs text-slate-400">Prevent missed reminders</p>
        </div>
      </div>
      
      <p className="text-sm text-slate-300 mb-4">
        Some Android devices (like Samsung, Xiaomi, or Huawei) aggressively kill background apps. 
        To ensure you receive your voice reminders on time, please allow DailyCoach to run in the background.
      </p>

      <button 
        onClick={handleRequestOptimization}
        className="w-full flex items-center justify-between bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-xl transition-colors text-left"
      >
        <span className="text-white font-medium text-sm">Open Battery Settings</span>
        <ChevronRight size={18} className="text-slate-400" />
      </button>
      
      {status && (
        <p className="text-xs text-morning mt-3 text-center">{status}</p>
      )}
    </div>
  );
}
