import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../features/auth/context/AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

const SOCKET_EVENTS = [
  'connect', 'connect_success', 'disconnect', 'error',
  'new_maintenance_request', 'maintenance_status_changed', 'maintenance_acknowledged',
  'lease_expiration_notification', 'lease_renewal_notification',
  'admin_notification', 'notification_received',
  'hub:message_created', 'hub:typing'
];

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const isMountedRef = useRef(true);
  
  // Use refs to track values and socket instance
  const prevUserIdRef = useRef(null);
  const prevTokenRef = useRef(null);
  const socketRef = useRef(null);
  const userRoleRef = useRef(null);
  const isConnectingRef = useRef(false); // Track if we're in the process of connecting

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const currentUserId = user?.id;
    const currentToken = token;
    const currentUserRole = user?.role;
    
    // Check if the values that matter have actually changed
    const userIdChanged = prevUserIdRef.current !== currentUserId;
    const tokenChanged = prevTokenRef.current !== currentToken;
    
    // If user or token is missing, disconnect and clean up
    if (!user || !token) {
      if (socketRef.current) {
        SOCKET_EVENTS.forEach((ev) => socketRef.current.off(ev));
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnectingRef.current = false;
      }
      setIsConnected(false);
      setLastEvent(null);
      prevUserIdRef.current = null;
      prevTokenRef.current = null;
      userRoleRef.current = null;
      return;
    }
    
    // Skip reconnection if nothing important changed and socket exists (either connected or connecting)
    if (!userIdChanged && !tokenChanged && (socketRef.current?.connected || isConnectingRef.current)) {
      return;
    }
    
    // Update refs
    prevUserIdRef.current = currentUserId;
    prevTokenRef.current = currentToken;
    userRoleRef.current = currentUserRole;
    
    // Disconnect existing socket if any
    if (socketRef.current) {
      SOCKET_EVENTS.forEach((ev) => socketRef.current.off(ev));
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const apiBase = process.env.REACT_APP_API_URL || '/api';
    const socketURL = apiBase.startsWith('/') ? window.location.origin : apiBase.replace(/\/api\/?$/, '');
    
    // Mark that we're starting a connection
    isConnectingRef.current = true;
    
    const newSocket = io(socketURL, {
      auth: { token: currentToken, userId: currentUserId, userRole: currentUserRole },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 3
    });

    const safeSetLastEvent = (payload) => {
      if (isMountedRef.current) setLastEvent(payload);
    };

    newSocket.on('connect', () => {
      isConnectingRef.current = false; // Connection established
      if (isMountedRef.current) setIsConnected(true);
    });
    newSocket.on('connect_success', () => {});
    newSocket.on('disconnect', () => {
      if (isMountedRef.current) setIsConnected(false);
    });
    newSocket.on('error', (error) => console.error('Socket error:', error));

    newSocket.on('new_maintenance_request', (data) =>
      safeSetLastEvent({ type: 'new_maintenance_request', data, timestamp: new Date() }));
    newSocket.on('maintenance_status_changed', (data) =>
      safeSetLastEvent({ type: 'maintenance_status_changed', data, timestamp: new Date() }));
    newSocket.on('maintenance_acknowledged', (data) =>
      safeSetLastEvent({ type: 'maintenance_acknowledged', data, timestamp: new Date() }));
    newSocket.on('lease_expiration_notification', (data) =>
      safeSetLastEvent({ type: 'lease_expiration_notification', data, timestamp: new Date() }));
    newSocket.on('lease_renewal_notification', (data) =>
      safeSetLastEvent({ type: 'lease_renewal_notification', data, timestamp: new Date() }));
    newSocket.on('admin_notification', (data) =>
      safeSetLastEvent({ type: 'admin_notification', data, timestamp: new Date() }));
    newSocket.on('notification_received', (data) =>
      safeSetLastEvent({ type: 'notification_received', data, timestamp: new Date() }));

    socketRef.current = newSocket;

    return () => {
      SOCKET_EVENTS.forEach((ev) => newSocket.off(ev));
      newSocket.removeAllListeners();
      newSocket.disconnect();
      socketRef.current = null;
      isConnectingRef.current = false;
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

  const emit = useCallback((eventName, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(eventName, data);
    } else {
      console.warn(`Socket not connected, cannot emit event: ${eventName}`);
    }
  }, []);

  const on = useCallback((eventName, callback) => {
    socketRef.current?.on(eventName, callback);
  }, []);

  const off = useCallback((eventName, callback) => {
    socketRef.current?.off(eventName, callback);
  }, []);

  const value = useMemo(() => ({
    socket: socketRef.current,
    isConnected,
    lastEvent,
    emit,
    on,
    off,
    emitMaintenanceRequest: (data) => emit('maintenance_request_created', data),
    emitMaintenanceStatusUpdate: (data) => emit('maintenance_status_updated', data),
    emitMaintenanceAcknowledged: (data) => emit('maintenance_acknowledged', data),
    emitLeaseExpirationAlert: (data) => emit('lease_expiration_alert', data),
    emitLeaseRenewal: (data) => emit('lease_renewed', data),
    broadcastAdminNotification: (data) => emit('broadcast_admin_notification', data),
    sendUserNotification: (data) => emit('send_user_notification', data),
    joinPropertyMaintenance: (propertyId) => emit('join_property_maintenance', propertyId)
  }), [isConnected, lastEvent, emit, on, off]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
