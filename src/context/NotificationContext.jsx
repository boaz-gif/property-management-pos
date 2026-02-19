import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import notificationAPI from '../services/notificationService';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  
  // Track previous user ID to prevent unnecessary fetches
  const prevUserIdRef = useRef(null);
  const socketRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      if (response.data.success) {
        setUnreadCount(response.data.data.unread_count || response.data.data);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const fetchRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationAPI.getNotifications({ limit: 5 });
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch when user ID actually changes
  useEffect(() => {
    const currentUserId = user?.id;
    
    if (currentUserId && prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      fetchUnreadCount();
      fetchRecentNotifications();
    } else if (!user && prevUserIdRef.current !== null) {
      prevUserIdRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, fetchUnreadCount, fetchRecentNotifications]);

  // Handle socket events - use refs to prevent re-registration
  useEffect(() => {
    if (!socket) {
      socketRef.current = null;
      return;
    }
    
    // Only register listeners if socket instance changed
    if (socketRef.current === socket) {
      return;
    }
    
    socketRef.current = socket;

    socket.on('notification_received', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);
      setHasNew(true);
      setTimeout(() => setHasNew(false), 2000);
    });

    socket.on('unread_count_update', (data) => {
      setUnreadCount(data.count);
    });

    return () => {
      if (socketRef.current === socket) {
        socket.off('notification_received');
        socket.off('unread_count_update');
        socketRef.current = null;
      }
    };
  }, [socket]);

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    hasNew,
    fetchUnreadCount,
    fetchRecentNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
