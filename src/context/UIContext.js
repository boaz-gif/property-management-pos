import React, { createContext, useState, useCallback, useContext, useMemo, useEffect } from 'react';

const UIStateContext = createContext();
const UIActionsContext = createContext();

export const UIProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false');
  const [notifications, setNotifications] = useState([]);
  const [loadingStates, setLoadingStates] = useState({});
  const [modals, setModals] = useState({});
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
    localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  // Sidebar controls
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const setSidebarState = useCallback((open) => {
    setSidebarOpen(open);
  }, []);

  // Dark mode controls
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const setDarkModeState = useCallback((isDark) => {
    setDarkMode(isDark);
  }, []);

  // Notification controls
  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id, timestamp: new Date() };
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Loading state controls
  const setLoading = useCallback((key, loading) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  }, []);

  const isLoading = useCallback((key) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const clearAllLoading = useCallback(() => {
    setLoadingStates({});
  }, []);

  // Modal controls
  const openModal = useCallback((modalId, data = null) => {
    setModals(prev => ({ ...prev, [modalId]: { open: true, data } }));
  }, []);

  const closeModal = useCallback((modalId) => {
    setModals(prev => ({ ...prev, [modalId]: { open: false, data: null } }));
  }, []);

  const isModalOpen = useCallback((modalId) => {
    return modals[modalId]?.open || false;
  }, [modals]);

  const getModalData = useCallback((modalId) => {
    return modals[modalId]?.data || null;
  }, [modals]);

  const closeAllModals = useCallback(() => {
    setModals({});
  }, []);

  // Toast controls
  const addToast = useCallback((toast) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id, timestamp: new Date() };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after specified duration or default 3 seconds
    const duration = toast.duration || 3000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Utility functions
  const showSuccessToast = useCallback((message, options = {}) => {
    addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const showErrorToast = useCallback((message, options = {}) => {
    addToast({ type: 'error', message, ...options });
  }, [addToast]);

  const showInfoToast = useCallback((message, options = {}) => {
    addToast({ type: 'info', message, ...options });
  }, [addToast]);

  const showWarningToast = useCallback((message, options = {}) => {
    addToast({ type: 'warning', message, ...options });
  }, [addToast]);

  const state = useMemo(() => ({
    sidebarOpen,
    darkMode,
    notifications,
    loadingStates,
    modals,
    toasts,
    isModalOpen,
    getModalData,
    isLoading
  }), [
    sidebarOpen, darkMode, notifications, loadingStates, modals, toasts, isModalOpen, getModalData, isLoading
  ]);

  const actions = useMemo(() => ({
    toggleSidebar,
    setSidebarState,
    toggleDarkMode,
    setDarkModeState,
    addNotification,
    removeNotification,
    clearNotifications,
    setLoading,
    clearAllLoading,
    openModal,
    closeModal,
    closeAllModals,
    addToast,
    removeToast,
    clearToasts,
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarningToast,
  }), [
    toggleSidebar, setSidebarState, toggleDarkMode, setDarkModeState,
    addNotification, removeNotification, clearNotifications,
    setLoading, clearAllLoading,
    openModal, closeModal, closeAllModals,
    addToast, removeToast, clearToasts,
    showSuccessToast, showErrorToast, showInfoToast, showWarningToast
  ]);

  return (
    <UIStateContext.Provider value={state}>
      <UIActionsContext.Provider value={actions}>
        {children}
      </UIActionsContext.Provider>
    </UIStateContext.Provider>
  );
};

export const useUIState = () => {
    const context = useContext(UIStateContext);
    if (!context) throw new Error('useUIState must be used within UIProvider');
    return context;
};

export const useUIActions = () => {
    const context = useContext(UIActionsContext);
    if (!context) throw new Error('useUIActions must be used within UIProvider');
    return context;
};

export const useUI = () => {
  const state = useUIState();
  const actions = useUIActions();
  return { ...state, ...actions };
};

// Selective hooks for better performance
export const useSidebar = () => {
  const { sidebarOpen, toggleSidebar, setSidebarState } = useUI();
  return { sidebarOpen, toggleSidebar, setSidebarState };
};

export const useDarkMode = () => {
  const { darkMode, toggleDarkMode, setDarkModeState } = useUI();
  return { darkMode, toggleDarkMode, setDarkModeState };
};

export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, clearNotifications } = useUI();
  return { notifications, addNotification, removeNotification, clearNotifications };
};

export const useLoading = () => {
  const { loadingStates, setLoading, isLoading, clearAllLoading } = useUI();
  return { loadingStates, setLoading, isLoading, clearAllLoading };
};

export const useModals = () => {
  const { modals, openModal, closeModal, isModalOpen, getModalData, closeAllModals } = useUI();
  return { modals, openModal, closeModal, isModalOpen, getModalData, closeAllModals };
};

export const useToasts = () => {
  const { 
    toasts, 
    addToast, 
    removeToast, 
    clearToasts, 
    showSuccessToast, 
    showErrorToast, 
    showInfoToast, 
    showWarningToast 
  } = useUI();
  return { 
    toasts, 
    addToast, 
    removeToast, 
    clearToasts, 
    showSuccessToast, 
    showErrorToast, 
    showInfoToast, 
    showWarningToast 
  };
};
