import React from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { getFlag } from '../utils/featureFlags';

const GlobalLoadingIndicator = () => {
  const isFetching = useIsFetching();
  const isEnabled = getFlag('GLOBAL_LOADING');

  if (!isEnabled || isFetching === 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 w-full z-[9999] h-1 bg-transparent pointer-events-none"
      role="progressbar"
      aria-valuetext="Loading..."
    >
      <div 
        className="h-full bg-blue-500"
        style={{
          width: '100%',
          backgroundImage: 'linear-gradient(to right, transparent 0%, #3b82f6 50%, transparent 100%)',
          backgroundSize: '50% 100%',
          backgroundRepeat: 'no-repeat',
          animation: 'indeterminate-loading 1.5s infinite linear'
        }}
      />
      <style>{`
        @keyframes indeterminate-loading {
          0% { background-position: -50% 0; }
          100% { background-position: 150% 0; }
        }
      `}</style>
    </div>
  );
};

export default GlobalLoadingIndicator;
