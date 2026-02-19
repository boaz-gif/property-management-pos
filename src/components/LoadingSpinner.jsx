import React from 'react';

function LoadingSpinner({ size = 'h-8 w-8', color = 'border-blue-500' }) {
  return (
    <div role="status" aria-label="loading" className={`animate-spin rounded-full border-b-2 ${color} ${size}`} />
  );
}

export default LoadingSpinner;
