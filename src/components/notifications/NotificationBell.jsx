import React from 'react';
import { Bell } from 'lucide-react';

const NotificationBell = ({ unreadCount, onClick, hasNew }) => {
  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-gray-400 hover:text-white transition-all duration-300 rounded-lg hover:bg-white/5 group ${
        hasNew ? 'animate-pulse' : ''
      }`}
      aria-label="Notifications"
    >
      <Bell className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${
        hasNew ? 'text-blue-400' : ''
      }`} />
      
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center bg-red-500 text-[10px] font-bold text-white rounded-full border border-gray-900 shadow-lg transform translate-x-1/4 -translate-y-1/4">
          {displayCount}
        </span>
      )}
      
      {hasNew && (
        <span className="absolute inset-0 rounded-lg bg-blue-500/20 animate-ping"></span>
      )}
    </button>
  );
};

export default NotificationBell;
