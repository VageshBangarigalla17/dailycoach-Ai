import React from 'react';
import TaskCard from './TaskCard';

export default function Timeline({ tasks, logs, currentTime }) {
  // Sort tasks by start time
  const sortedTasks = [...tasks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const isTaskCurrent = (task) => {
    const now = currentTime || new Date();
    const currentHrs = now.getHours().toString().padStart(2, '0');
    const currentMins = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHrs}:${currentMins}`;
    
    return currentTimeStr >= task.startTime && currentTimeStr < task.endTime;
  };

  return (
    <div className="relative pt-4 pb-8 pl-6">
      {/* Vertical Timeline Line */}
      <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-800"></div>
      
      {sortedTasks.map((task, index) => {
        const current = isTaskCurrent(task);
        return (
          <div key={task.id || index} className="relative mb-6">
            {/* Timeline Dot */}
            <div className={`
              absolute -left-7 top-4 w-3.5 h-3.5 rounded-full border-2 border-background z-10
              ${current ? 'bg-morning shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse' : 'bg-slate-600'}
            `}></div>
            
            <TaskCard 
              task={task} 
              log={logs?.[task.id]} 
              isCurrent={current}
            />
          </div>
        );
      })}

      {sortedTasks.length === 0 && (
        <div className="text-center text-slate-500 py-8 italic font-sans">
          No tasks scheduled for today.
        </div>
      )}
    </div>
  );
}
