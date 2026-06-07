import React from 'react';
import { Clock } from 'lucide-react';

export default function TaskCard({ task, log, onClick, isCurrent }) {
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const getStatusColor = () => {
    if (log?.status === 'active') return 'bg-morning text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]';
    if (log?.status === 'done') return 'bg-done text-white';
    if (log?.status === 'late') return 'bg-late text-slate-900';
    if (log?.status === 'missed') return 'bg-missed text-white';
    if (isCurrent) return 'bg-morning text-white';
    return 'bg-slate-700 text-slate-300';
  };

  const getBorderColor = () => {
    switch (task.color) {
      case 'morning': return 'border-l-morning';
      case 'afternoon': return 'border-l-afternoon';
      case 'evening': return 'border-l-evening';
      case 'night': return 'border-l-night';
      default: return 'border-l-morning';
    }
  };

  const getStatusText = () => {
    if (log?.status === 'active') return 'In Progress';
    if (log?.status === 'done') return 'Done';
    if (log?.status === 'late') return 'Late';
    if (log?.status === 'missed') return 'Missed';
    if (isCurrent) return 'Active Now';
    return 'Upcoming';
  };

  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur-sm
        border border-slate-700/50 border-l-4 ${getBorderColor()}
        p-4 mb-4 cursor-pointer transition-all duration-300 ease-in-out
        hover:bg-slate-800/80 hover:shadow-lg
        ${isCurrent || log?.status === 'active' ? 'ring-2 ring-morning/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold font-sans text-slate-100 tracking-tight">
          {task.taskName}
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase tracking-wider ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      
      <div className="flex items-center text-slate-400">
        <Clock size={14} className="mr-1.5" />
        <span className="font-mono text-sm">
          {formatTime12h(task.startTime)} - {formatTime12h(task.endTime)}
        </span>
      </div>
    </div>
  );
}
