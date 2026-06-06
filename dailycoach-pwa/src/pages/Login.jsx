import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity } from 'lucide-react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

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
      alert("Authentication failed.");
    }
  };

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
    </div>
  );
}
