import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, BarChart2, Settings } from 'lucide-react';

export default function Navbar() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/schedule', icon: Calendar, label: 'Schedule' },
    { to: '/reports', icon: BarChart2, label: 'Reports' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-background border-t border-slate-800 pb-safe shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${
                isActive ? 'text-morning' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <item.icon size={24} className="stroke-[1.5]" />
            <span className="text-[10px] font-medium font-sans">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
