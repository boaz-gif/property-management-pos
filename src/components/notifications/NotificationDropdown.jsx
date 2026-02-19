import React, { useRef, useEffect } from 'react';
import { BellOff, CheckCheck, Loader2 } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = ({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onDelete, 
  onClose,
  loading 
}) => {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleItemClick = (notification) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    const payload = typeof notification.data === 'string'
      ? (() => { try { return JSON.parse(notification.data); } catch { return {}; } })()
      : (notification.data || {});

    // Simple routing logic based on type
    if (notification.type.includes('message')) {
      const conversationId = payload.conversation_id || payload.conversationId;
      navigate(conversationId ? `/messages/${conversationId}` : '/messages');
    } else if (notification.type.includes('payment')) {
      navigate('/tenant/payments');
    } else if (notification.type.includes('maintenance')) {
      navigate('/tenant/maintenance');
    } else if (notification.type.includes('lease')) {
      navigate('/tenant/dashboard'); // Or lease-specific page if it exists
    }
    
    onClose();
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 max-h-[500px] bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in duration-200"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
        <h3 className="text-sm font-bold text-white">Notifications</h3>
        {notifications.length > 0 && (
          <button 
            onClick={onMarkAllAsRead}
            className="text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="p-3 bg-white/5 rounded-full mb-3 text-gray-600">
              <BellOff size={24} />
            </div>
            <p className="text-sm font-medium text-gray-300">No notifications yet</p>
            <p className="text-xs text-gray-500 mt-1">We'll notify you when something important happens.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notif) => (
              <NotificationItem 
                key={notif.id}
                notification={notif}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
                onClick={handleItemClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-center bg-white/5">
        <button 
          onClick={() => {
            navigate('/notifications'); // Assumes a full notifications page exists or will be created
            onClose();
          }}
          className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
