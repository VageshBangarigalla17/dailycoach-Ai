import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Volume2, Bell, LogOut, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const { currentUser, signOut } = useAuth();
  
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleNotificationRequest = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          alert('Notifications enabled!');
        }
      });
    } else {
      alert('This browser does not support notifications.');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <header className="mb-6 pt-6">
        <h1 className="text-3xl font-bold font-sans text-white">Settings</h1>
        <p className="text-slate-400 font-sans">Manage your preferences</p>
      </header>

      <div className="space-y-6 mb-12">
        {/* Profile Section */}
        <section className="bg-slate-800/50 backdrop-blur-md p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center mb-4 text-white">
            <User size={20} className="mr-2 text-morning" />
            <h2 className="text-lg font-bold">Profile</h2>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-morning"
            />
          </div>
          
          <div className="mb-2">
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input 
              type="email" 
              value={currentUser?.email || ''}
              disabled
              className="w-full bg-slate-900/30 border border-slate-700 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
            />
          </div>
        </section>

        {/* Voice Preferences Section */}
        <section className="bg-slate-800/50 backdrop-blur-md p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between mb-4 text-white">
            <div className="flex items-center">
              <Volume2 size={20} className="mr-2 text-evening" />
              <h2 className="text-lg font-bold">Voice Coach</h2>
            </div>
            
            {/* Toggle Switch */}
            <div 
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                voiceEnabled ? 'bg-done' : 'bg-slate-600'
              }`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                voiceEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}></div>
            </div>
          </div>
          
          <div className={`space-y-4 transition-opacity ${!voiceEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="text-slate-400">Voice Speed</label>
                <span className="text-white font-mono">{voiceSpeed}x</span>
              </div>
              <input 
                type="range" 
                min="0.5" max="2" step="0.1"
                value={voiceSpeed}
                onChange={e => setVoiceSpeed(parseFloat(e.target.value))}
                className="w-full accent-evening"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="text-slate-400">Voice Pitch</label>
                <span className="text-white font-mono">{voicePitch}</span>
              </div>
              <input 
                type="range" 
                min="0" max="2" step="0.1"
                value={voicePitch}
                onChange={e => setVoicePitch(parseFloat(e.target.value))}
                className="w-full accent-evening"
              />
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="bg-slate-800/50 backdrop-blur-md p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center mb-4 text-white">
            <Bell size={20} className="mr-2 text-afternoon" />
            <h2 className="text-lg font-bold">Notifications</h2>
          </div>
          
          <p className="text-sm text-slate-400 mb-4">
            Enable push notifications to receive reminders even when the app is closed.
          </p>
          
          <button 
            onClick={handleNotificationRequest}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-semibold rounded-xl transition-colors"
          >
            Enable Notifications
          </button>
        </section>

        {/* Danger Zone */}
        <section className="pt-4 pb-8">
          <button 
            onClick={handleSignOut}
            className="w-full py-4 bg-missed/10 hover:bg-missed/20 border border-missed/50 text-missed font-bold rounded-xl flex items-center justify-center transition-colors"
          >
            <LogOut size={20} className="mr-2" /> Sign Out
          </button>
        </section>
      </div>
      
    </div>
  );
}
