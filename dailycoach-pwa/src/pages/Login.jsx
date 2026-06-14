import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Settings } from 'lucide-react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Dev Settings State
  const [showDevConfig, setShowDevConfig] = useState(false);
  const [devIp, setDevIp] = useState('');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedIp = localStorage.getItem('dev_api_url');
    if (savedIp) setDevIp(savedIp);
  }, []);

  const handleSaveDevIp = () => {
    if (devIp.trim()) {
      // Ensure it starts with http:// and ends with /api if not specified
      let url = devIp.trim();
      if (!url.startsWith('http')) url = 'http://' + url;
      if (!url.endsWith('/api') && !url.includes('vercel.app')) {
        // Assume port 5000 if not specified
        if (!url.includes(':', 6)) url = url + ':5000';
        url = url + '/api';
      }
      localStorage.setItem('dev_api_url', url);
    } else {
      localStorage.removeItem('dev_api_url');
    }
    setShowDevConfig(false);
    window.location.reload(); // Reload to re-initialize axios and websockets
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      navigate('/');
    } catch (error) {
      console.error("Auth error", error);
      alert(`Authentication failed: ${error.message || error}`);
    }
  };

  const currentApiUrl = typeof window !== 'undefined' ? localStorage.getItem('dev_api_url') : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-morning/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-evening/20 rounded-full blur-[100px]"></div>
      
      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-morning to-evening rounded-2xl flex items-center justify-center mb-4 shadow-xl">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold font-sans text-white tracking-tight">DailyCoach AI</h1>
          <p className="text-slate-400 font-sans mt-2">Your personal AI life coach</p>
          {currentApiUrl && (
            <p className="text-xs text-morning font-mono mt-2 bg-slate-900/50 px-2 py-1 rounded">
              Target: {currentApiUrl}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">
            {isRegister ? 'Create an Account' : 'Welcome Back'}
          </h2>
          
          {isRegister && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-morning transition-colors"
                placeholder="John Doe"
              />
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-morning transition-colors"
              placeholder="you@example.com"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-morning transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-3 bg-morning hover:bg-blue-600 text-white font-bold rounded-xl transition-colors mb-4"
          >
            {isRegister ? 'Sign Up' : 'Sign In'}
          </button>

          <button 
            type="button" 
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-sm text-slate-400 hover:text-white transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </form>
      </div>

      {/* Developer Settings Button */}
      <button 
        onClick={() => setShowDevConfig(true)}
        className="absolute bottom-4 right-4 p-3 bg-slate-800/80 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-20 shadow-lg border border-slate-700"
      >
        <Settings size={20} />
      </button>

      {/* Developer Settings Modal */}
      {showDevConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Developer Config</h3>
            <p className="text-sm text-slate-400 mb-4">
              Enter the new local IP address (e.g., <code className="bg-slate-900 px-1 rounded">10.181.232.83</code>). Leave blank to reset to default.
            </p>
            <input 
              type="text" 
              value={devIp}
              onChange={(e) => setDevIp(e.target.value)}
              placeholder="e.g., 10.181.232.83"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-morning transition-colors mb-6"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDevConfig(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveDevIp}
                className="flex-1 py-3 bg-morning hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
              >
                Save & Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
