import React, { useState } from 'react';
import { useSchedule } from '../contexts/ScheduleContext';
import { Plus, Edit2, Trash2, CheckCircle } from 'lucide-react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleBuilder() {
  const { schedules, addSchedule, updateSchedule, deleteSchedule } = useSchedule();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [taskName, setTaskName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const determineColor = (timeStr) => {
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskName || selectedDays.length === 0) return;

    const scheduleData = {
      taskName,
      startTime,
      endTime,
      days: selectedDays,
      color: determineColor(startTime)
    };

    if (isEditing) {
      await updateSchedule(editId, scheduleData);
      setIsEditing(false);
      setEditId(null);
    } else {
      await addSchedule(scheduleData);
    }

    // Reset form
    setTaskName('');
    setStartTime('09:00');
    setEndTime('10:00');
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  };

  const handleEdit = (schedule) => {
    setIsEditing(true);
    setEditId(schedule.id);
    setTaskName(schedule.taskName);
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setSelectedDays(schedule.days);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      await deleteSchedule(id);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    await updateSchedule(id, { isActive: !currentStatus });
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <header className="mb-6 pt-6">
        <h1 className="text-3xl font-bold font-sans text-white">Schedule</h1>
        <p className="text-slate-400 font-sans">Build your ideal routine</p>
      </header>

      {/* Form Section */}
      <section className="bg-slate-800/50 backdrop-blur-md p-5 rounded-2xl border border-slate-700 mb-8">
        <h2 className="text-lg font-bold text-white mb-4">
          {isEditing ? 'Edit Task' : 'Add New Task'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-1">Task Name</label>
            <input 
              type="text" 
              required
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-morning"
              placeholder="e.g., Morning Run"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Start Time</label>
              <input 
                type="time" 
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-morning"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">End Time</label>
              <input 
                type="time" 
                required
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-morning"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-slate-300 mb-2">Days of Week</label>
            <div className="flex justify-between">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    selectedDays.includes(day) 
                      ? 'bg-morning text-white shadow-lg' 
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full flex items-center justify-center py-3 bg-morning hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
          >
            {isEditing ? <CheckCircle size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
            {isEditing ? 'Save Changes' : 'Add Task'}
          </button>
        </form>
      </section>

      {/* List Section */}
      <section>
        <h2 className="text-xl font-bold text-slate-200 mb-4 font-sans">My Schedules</h2>
        
        {schedules.length === 0 ? (
          <div className="text-center text-slate-500 py-6 italic font-sans">
            No tasks created yet.
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map(schedule => (
              <div key={schedule.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-lg">{schedule.taskName}</h3>
                  
                  {/* Custom Toggle Switch */}
                  <div 
                    onClick={() => handleToggleActive(schedule.id, schedule.isActive)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                      schedule.isActive ? 'bg-morning' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                      schedule.isActive ? 'translate-x-6' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
                
                <div className="text-sm font-mono text-slate-400 mb-3">
                  {schedule.startTime} - {schedule.endTime}
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {schedule.days.map(day => (
                    <span key={day} className="text-[10px] uppercase bg-slate-700 text-slate-300 px-2 py-0.5 rounded-sm">
                      {day}
                    </span>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-3 mt-2 border-t border-slate-700 pt-3">
                  <button 
                    onClick={() => handleEdit(schedule)}
                    className="flex items-center text-sm text-morning hover:text-blue-400 transition-colors"
                  >
                    <Edit2 size={14} className="mr-1" /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(schedule.id)}
                    className="flex items-center text-sm text-missed hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} className="mr-1" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Extra padding for navbar */}
      <div className="h-10"></div>
    </div>
  );
}
