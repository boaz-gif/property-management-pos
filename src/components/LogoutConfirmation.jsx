import React, { useState } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';

/**
 * Logout Confirmation Modal Component
 */
export const LogoutConfirmation = ({ isOpen, onConfirm, onCancel, isLoggingOut }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Logout</h2>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to logout? You will need to sign in again to access your account.
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-center">
            <input 
              type="checkbox" 
              className="mr-3 w-4 h-4 text-blue-600"
              defaultChecked={false}
            />
            <span className="text-sm text-gray-600">
              Also logout from all other devices
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoggingOut}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
          >
            {isLoggingOut ? (
              <>
                <span className="inline-block mr-2 animate-spin">⟳</span>
                Logging out...
              </>
            ) : (
              'Logout'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Rate Limit Error Component
 */
export const RateLimitError = ({ isOpen, retryAfter, onClose }) => {
  const [countdown, setCountdown] = useState(retryAfter);

  React.useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold mb-2 text-gray-800 text-center">Too Many Attempts</h2>
        
        <p className="text-gray-600 mb-4 text-center">
          You've made too many requests. Please wait before trying again.
        </p>

        {countdown > 0 && (
          <p className="text-center text-lg font-semibold text-red-600 mb-4">
            Retry in {countdown} seconds
          </p>
        )}

        <button
          onClick={onClose}
          disabled={countdown > 0}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {countdown > 0 ? 'Please wait...' : 'Close'}
        </button>
      </div>
    </div>
  );
};

/**
 * Session Expiration Warning Component
 */
export const SessionExpirationWarning = ({ isOpen, timeRemaining, onExtend, onLogout }) => {
  const [countdown, setCountdown] = React.useState(timeRemaining);

  React.useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onLogout]);

  if (!isOpen) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Session Expiring Soon</h2>
        
        <p className="text-gray-600 mb-6">
          Your session is about to expire. Would you like to stay logged in?
        </p>

        <p className="text-center text-2xl font-bold text-red-600 mb-6">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Logout
          </button>
          <button
            onClick={onExtend}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to handle logout with confirmation
 */
export const useLogoutWithConfirmation = () => {
  const auth = useAuth();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);

  const handleLogoutConfirm = async (e) => {
    const logoutAll = e.currentTarget.querySelector('input[type="checkbox"]')?.checked || logoutAllDevices;
    setIsLoggingOut(true);

    try {
      if (logoutAll) {
        await auth.logoutAll();
      } else {
        await auth.logout();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Still logout locally even if API fails
      await auth.logout();
    } finally {
      setIsLoggingOut(false);
      setIsConfirmOpen(false);
    }
  };

  const openLogoutConfirmation = (logoutAll = false) => {
    setLogoutAllDevices(logoutAll);
    setIsConfirmOpen(true);
  };

  const closeLogoutConfirmation = () => {
    setIsConfirmOpen(false);
  };

  return {
    isConfirmOpen,
    isLoggingOut,
    openLogoutConfirmation,
    closeLogoutConfirmation,
    handleLogoutConfirm
  };
};

/**
 * Hook to handle rate limit errors
 */
export const useRateLimitHandler = () => {
  const [rateLimitError, setRateLimitError] = useState(null);
  const [retryAfter, setRetryAfter] = useState(0);

  const handleError = (error) => {
    if (error.response?.status === 429) {
      const retryAfterValue = error.response.data?.retryAfter || 60;
      setRetryAfter(retryAfterValue);
      setRateLimitError(true);
      
      // Auto-close after retry period
      setTimeout(() => {
        setRateLimitError(false);
      }, retryAfterValue * 1000);
    }
  };

  const closeError = () => {
    setRateLimitError(false);
  };

  return {
    rateLimitError,
    retryAfter,
    handleError,
    closeError
  };
};

/**
 * Hook to handle session expiration warnings
 */
export const useSessionExpirationWarning = () => {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(5 * 60); // 5 minutes default
  const auth = useAuth();

  const showWarning = (secondsUntilExpiry) => {
    setTimeRemaining(secondsUntilExpiry);
    setIsWarningOpen(true);
  };

  const handleExtend = async () => {
    try {
      await auth.refreshToken();
      setIsWarningOpen(false);
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    setIsWarningOpen(false);
  };

  return {
    isWarningOpen,
    timeRemaining,
    showWarning,
    handleExtend,
    handleLogout
  };
};
