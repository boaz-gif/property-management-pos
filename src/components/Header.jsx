import React, { useState } from 'react';
import { Moon, Search, Sun } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import NotificationBell from './notifications/NotificationBell';
import NotificationDropdown from './notifications/NotificationDropdown';
import { useDarkMode } from '../context/UIContext';

const Header = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    const { darkMode, toggleDarkMode } = useDarkMode();
    const { 
        notifications, 
        unreadCount, 
        loading, 
        hasNew, 
        markAsRead, 
        markAllAsRead, 
        deleteNotification 
    } = useNotifications();

    return (
        <header className="h-16 bg-gray-900/50 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="flex items-center gap-4 w-96">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={toggleDarkMode}
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                    {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className="relative">
                    <NotificationBell 
                        unreadCount={unreadCount} 
                        onClick={() => setShowDropdown(!showDropdown)}
                        hasNew={hasNew}
                    />
                    
                    {showDropdown && (
                        <NotificationDropdown 
                            notifications={notifications}
                            loading={loading}
                            onMarkAsRead={markAsRead}
                            onMarkAllAsRead={markAllAsRead}
                            onDelete={deleteNotification}
                            onClose={() => setShowDropdown(false)}
                        />
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
