import React from 'react';
import { useSchedule } from '../contexts/ScheduleContext';
import { Flame, Trophy, AlertTriangle } from 'lucide-react';

export default function Reports() {
  const { schedules } = useSchedule();

  // Mock data for presentation
  const streak = 5;
  const completionRate = 85;
  
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const mockHeatmapData = [
    'done', 'done', 'done', 'late', 'done', 'upcoming', 'upcoming'
  ];

  const getColorForStatus = (status) => {
    switch (status) {
      case 'done': return 'bg-done';
      case 'late': return 'bg-late';
      case 'missed': return 'bg-missed';
      default: return 'bg-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <header className="mb-6 pt-6">
        <h1 className="text-3xl font-bold font-sans text-white">Reports</h1>
        <p className="text-slate-400 font-sans">Your progress and history</p>
      </header>

      {/* Streak Card */}
      <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-orange-200 text-sm font-medium mb-1">Current Streak</p>
          <div className="flex items-end">
            <span className="text-4xl font-bold text-white mr-2">{streak}</span>
            <span className="text-orange-200 font-medium mb-1 pb-0.5">Days</span>
          </div>
        </div>
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
          <Flame size={32} className="text-orange-500" />
        </div>
      </div>

      {/* Weekly Heatmap */}
      <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-5 border border-slate-700 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">This Week</h2>
        
        <div className="flex justify-between items-end mb-2">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-lg mb-2 flex items-center justify-center shadow-inner ${getColorForStatus(mockHeatmapData[i])}`}
              >
                {mockHeatmapData[i] === 'done' && <div className="w-2 h-2 rounded-full bg-white/50"></div>}
              </div>
              <span className="text-xs text-slate-400 font-mono">{day}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between text-xs text-slate-500 mt-4 border-t border-slate-700 pt-3">
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-done mr-1"></div> Done</span>
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-late mr-1"></div> Late</span>
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-missed mr-1"></div> Missed</span>
        </div>
      </div>

      {/* Stats Overview */}
      <h2 className="text-xl font-bold text-slate-200 mb-4 font-sans mt-8">Task Performance</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <Trophy size={18} className="text-done" />
            <span className="text-2xl font-bold text-white">{completionRate}%</span>
          </div>
          <p className="text-xs text-slate-400">Completion Rate</p>
        </div>
        
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle size={18} className="text-late" />
            <span className="text-2xl font-bold text-white">2</span>
          </div>
          <p className="text-xs text-slate-400">Tasks Missed</p>
        </div>
      </div>

      {/* Task List Performance */}
      <div className="space-y-3 mb-10">
        {schedules.map((schedule, i) => (
          <div key={schedule.id || i} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <span className="font-medium text-slate-300 truncate pr-4">{schedule.taskName}</span>
            <div className="flex items-center min-w-[60px]">
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mr-2">
                <div className="bg-morning h-full" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
