import React from 'react';

const GlassCard = ({ children, className = '', ...props }) => {
  return (
    <div className={`glass-card p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default GlassCard;
