import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Flame, Trophy, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Reports() {
  const [stats, setStats] = useState({
    currentStreakDays: 0,
    completionPercentageThisWeek: 0,
    totalTasksCompleted: 0,
    mostMissedTask: 'None',
    bestPerformedTask: 'None'
  });
  
  const [schedules, setSchedules] = useState([]);
  const [weekLogs, setWeekLogs] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const today = new Date();
        const sevenDaysAgo = subDays(today, 6);
        const startDateStr = format(sevenDaysAgo, 'yyyy-MM-dd');

        const [statsRes, schedulesRes, weekLogsRes, todayLogsRes] = await Promise.all([
          api.get('/users/stats'),
          api.get('/schedules'),
          api.get(`/logs/week?startDate=${startDateStr}`),
          api.get('/logs/today')
        ]);
        
        if (statsRes.data.success) {
          setStats(statsRes.data.stats);
        }
        if (schedulesRes.data.success) {
          setSchedules(schedulesRes.data.schedules);
        }
        if (weekLogsRes.data.success) {
          setWeekLogs(weekLogsRes.data.logs);
        }
        if (todayLogsRes.data.success) {
          setTodayLogs(todayLogsRes.data.logs);
        }
      } catch (error) {
        console.error("Failed to fetch reports data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportsData();
  }, []);

  // Generate last 7 days for heatmap
  const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
  const weekDays = last7Days.map(d => format(d, 'EEEE').charAt(0)); // M, T, W...

  // Compute heatmap data
  const heatmapData = last7Days.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const logsForDay = weekLogs.filter(l => l.date === dateStr);
    
    if (logsForDay.length === 0) {
      return date > new Date() ? 'upcoming' : 'slate-200';
    }

    const completed = logsForDay.filter(l => l.status === 'done' || l.status === 'late').length;
    const total = logsForDay.length;
    const percentage = completed / total;

    if (percentage === 1) return 'done';
    if (percentage >= 0.5) return 'late'; // yellow for partial
    return 'missed'; // red for mostly missed
  });

  const getColorForStatus = (status) => {
    switch (status) {
      case 'done': return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
      case 'late': return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
      case 'missed': return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      default: return 'bg-slate-200';
    }
  };

  // Compute per-task completion rates
  const taskRates = schedules.map(schedule => {
    const logsForTask = weekLogs.filter(l => l.scheduleId === schedule.id || l.scheduleId?._id === schedule.id);
    const completed = logsForTask.filter(l => l.status === 'done' || l.status === 'late').length;
    const rate = logsForTask.length > 0 ? (completed / logsForTask.length) * 100 : 0;
    return {
      ...schedule,
      rate,
      totalAttempts: logsForTask.length
    };
  }).sort((a, b) => b.rate - a.rate);

  if (loading) {
    return <div className="min-h-screen bg-background p-4 flex items-center justify-center text-slate-300 font-sans">Loading reports...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <header className="mb-6 pt-6">
        <h1 className="text-3xl font-bold font-sans text-white tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">Reports</h1>
        <p className="text-slate-400 font-sans tracking-wide">Your progress and history</p>
      </header>

      {/* Streak Card */}
      <div className="relative bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 mb-8 flex items-center justify-between border border-orange-500/30 overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.15)]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-orange-400/80 text-xs font-bold mb-1 uppercase tracking-widest">Current Streak</p>
          <div className="flex items-end">
            <span className="text-5xl font-black text-white mr-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">{stats.currentStreakDays}</span>
            <span className="text-orange-300/80 font-medium mb-1.5 pb-0.5 tracking-wider">Days</span>
          </div>
          {stats.currentStreakDays > 0 && (
            <p className="text-xs text-orange-200/90 mt-2 font-medium tracking-wide">You're doing great! Keep it up 🔥</p>
          )}
        </div>
        <div className="relative z-10 w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center border border-orange-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse">
          <Flame size={32} className="text-orange-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
        </div>
      </div>

      {/* Weekly Heatmap */}
      <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-5 border border-slate-800/80 mb-6 shadow-xl relative overflow-hidden">
        <h2 className="text-lg font-bold text-slate-200 mb-4 tracking-wide relative z-10">Last 7 Days</h2>
        
        <div className="flex justify-between items-end mb-2">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-lg mb-2 flex items-center justify-center transition-all ${getColorForStatus(heatmapData[i])}`}
              >
                {heatmapData[i] === 'done' && <div className="w-2 h-2 rounded-full bg-white/50"></div>}
              </div>
              <span className="text-xs text-slate-500 font-bold">{day}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between text-xs text-slate-400 mt-4 border-t border-slate-800/50 pt-3 font-medium tracking-wide">
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-done mr-1.5 shadow-[0_0_5px_#10b981]"></div> Perfect</span>
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-late mr-1.5 shadow-[0_0_5px_#eab308]"></div> Partial</span>
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-missed mr-1.5 shadow-[0_0_5px_#ef4444]"></div> Missed</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-3xl border border-slate-800/80 shadow-xl relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-done/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <Trophy size={20} className="text-done drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-3xl font-black text-white">{stats.completionPercentageThisWeek}%</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest relative z-10">Week Completion</p>
        </div>
        
        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-3xl border border-slate-800/80 shadow-xl relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-morning/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <CheckCircle size={20} className="text-morning drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
            <span className="text-3xl font-black text-white">{stats.totalTasksCompleted}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest relative z-10">Total Completed</p>
        </div>
      </div>

      {/* Best & Worst Tasks */}
      <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-5 border border-slate-800/80 mb-8 shadow-xl">
        <h2 className="text-lg font-bold text-slate-200 mb-5 tracking-wide">Insights</h2>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Trophy size={16} className="text-done mr-3 drop-shadow-[0_0_5px_rgba(16,185,129,0.6)]" />
            <span className="text-sm text-slate-400 font-medium tracking-wide">Best Task</span>
          </div>
          <span className="text-sm font-bold text-slate-200">{stats.bestPerformedTask}</span>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
          <div className="flex items-center">
            <AlertTriangle size={16} className="text-missed mr-3 drop-shadow-[0_0_5px_rgba(239,68,68,0.6)]" />
            <span className="text-sm text-slate-400 font-medium tracking-wide">Needs Work</span>
          </div>
          <span className="text-sm font-bold text-slate-200">{stats.mostMissedTask}</span>
        </div>
      </div>

      {/* Today's Breakdown */}
      <h2 className="text-xl font-bold text-white mb-5 font-sans mt-8 tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">Today's Breakdown</h2>
      <div className="space-y-4 mb-10">
        {todayLogs.length === 0 ? (
          <p className="text-slate-500 text-center text-sm font-medium tracking-wide py-4 bg-slate-900/30 rounded-2xl border border-slate-800/50">No tasks completed or missed today yet.</p>
        ) : (
          todayLogs.map((log, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex items-center">
                {log.status === 'done' && <CheckCircle size={18} className="text-done mr-3 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />}
                {log.status === 'late' && <Clock size={18} className="text-late mr-3 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />}
                {log.status === 'missed' && <XCircle size={18} className="text-missed mr-3 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />}
                <span className="font-bold text-slate-200 tracking-wide">{log.taskName}</span>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-lg font-bold tracking-wider ${
                log.status === 'done' ? 'bg-done/10 text-done border border-done/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]' :
                log.status === 'late' ? 'bg-late/10 text-late border border-late/30 shadow-[0_0_10px_rgba(234,179,8,0.15)]' : 'bg-missed/10 text-missed border border-missed/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
              }`}>
                {log.completedAt ? log.completedAt : 'Missed'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Task List Performance with Recharts */}
      <h2 className="text-xl font-bold text-white mb-5 font-sans tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">Task Performance (7 Days)</h2>
      <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-slate-800/80 mb-12 shadow-xl h-[320px] relative overflow-hidden">
        {taskRates.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-slate-500 font-medium tracking-wide">No data available yet.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taskRates} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis 
                type="category" 
                dataKey="taskName" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 20px rgba(0,0,0,0.5)', color: '#fff', fontWeight: 'bold' }}
                formatter={(value) => [`${Math.round(value)}%`, 'Completion']}
              />
              <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={24}>
                {taskRates.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.rate >= 80 ? '#10b981' : entry.rate >= 50 ? '#eab308' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Extra padding for navbar */}
      <div className="h-10"></div>
    </div>
  );
}
