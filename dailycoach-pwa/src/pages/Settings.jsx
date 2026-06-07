import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, Volume2, Bell, LogOut, Save, Play, CheckCircle } from 'lucide-react';
import * as voiceService from '../services/voiceService';

export default function Settings() {
  const { currentUser, signOut } = useAuth();
  
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [voiceSpeed, setVoiceSpeed] = useState(currentUser?.preferredVoiceSpeed || 1.0);
  const [voiceGender, setVoiceGender] = useState(currentUser?.preferredVoiceGender || 'female');
  const [voicePitch, setVoicePitch] = useState(currentUser?.preferredVoiceGender === 'male' ? 0.8 : 1.2);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.name);
      setVoiceSpeed(currentUser.preferredVoiceSpeed || 1.0);
      setVoiceGender(currentUser.preferredVoiceGender || 'female');
      setVoicePitch(currentUser.preferredVoiceGender === 'male' ? 0.8 : 1.2);
    }
  }, [currentUser]);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.patch('/users/profile', {
        name: displayName,
        preferredVoiceSpeed: voiceSpeed,
        preferredVoiceGender: voiceGender
      });
      
      if (res.data.success) {
        // Update local storage so the new name/voice prefs are reflected globally
        const updatedUser = { ...currentUser, ...res.data.user };
        localStorage.setItem('dailycoach_user', JSON.stringify(updatedUser));
        // Note: In a full app, we'd also update the AuthContext state here
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestVoice = async () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    
    // Play beep first to unlock audio
    await voiceService.playBeep(150, 440);
    
    const sampleText = `Hey ${displayName.split(' ')[0]}! This is your DailyCoach speaking. How do I sound?`;
    
    await voiceService.speak(sampleText, {
      rate: voiceSpeed,
      pitch: voicePitch
    });
    
    setIsPlaying(false);
  };

  // Sync pitch with gender selection for the UI (this is just for the test voice)
  useEffect(() => {
    setVoicePitch(voiceGender === 'male' ? 0.8 : 1.2);
  }, [voiceGender]);

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <header className="mb-6 pt-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-sans text-white">Settings</h1>
          <p className="text-slate-400 font-sans">Manage your preferences</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center bg-morning/20 hover:bg-morning/30 text-morning border border-morning/50 rounded-lg px-4 py-2 font-bold transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <span className="w-5 h-5 border-2 border-morning border-t-transparent rounded-full animate-spin mr-2"></span>
          ) : (
            <Save size={18} className="mr-2" />
          )}
          Save
        </button>
      </header>
      
      {/* Save Success Toast */}
      {saveSuccess && (
        <div className="bg-done/20 border border-done text-done rounded-xl p-3 mb-6 flex items-center justify-center font-medium animate-pulse">
          <CheckCircle size={18} className="mr-2" /> Settings saved successfully
        </div>
      )}

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
          
          <div className={`space-y-5 transition-opacity ${!voiceEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            
            {/* Gender Selection */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Voice Tone</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setVoiceGender('female')}
                  className={`py-2 rounded-lg font-medium border transition-colors ${
                    voiceGender === 'female' 
                      ? 'bg-evening/20 border-evening text-evening' 
                      : 'bg-slate-900/50 border-slate-600 text-slate-400'
                  }`}
                >
                  Female
                </button>
                <button
                  onClick={() => setVoiceGender('male')}
                  className={`py-2 rounded-lg font-medium border transition-colors ${
                    voiceGender === 'male' 
                      ? 'bg-evening/20 border-evening text-evening' 
                      : 'bg-slate-900/50 border-slate-600 text-slate-400'
                  }`}
                >
                  Male
                </button>
              </div>
            </div>

            {/* Speed Slider */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="text-slate-400">Voice Speed</label>
                <span className="text-white font-mono">{voiceSpeed}x</span>
              </div>
              <input 
                type="range" 
                min="0.5" max="1.5" step="0.1"
                value={voiceSpeed}
                onChange={e => setVoiceSpeed(parseFloat(e.target.value))}
                className="w-full accent-evening"
              />
            </div>
            
            {/* Test Voice Button */}
            <button
              onClick={handleTestVoice}
              disabled={isPlaying}
              className="w-full mt-2 py-3 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 text-white font-medium rounded-xl flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <span className="flex items-center text-evening">
                  <span className="w-4 h-4 border-2 border-evening border-t-transparent rounded-full animate-spin mr-2"></span>
                  Speaking...
                </span>
              ) : (
                <span className="flex items-center">
                  <Play size={16} className="mr-2 text-evening" /> Test Voice
                </span>
              )}
            </button>
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
      
      {/* Extra padding for navbar */}
      <div className="h-10"></div>
    </div>
  );
}
