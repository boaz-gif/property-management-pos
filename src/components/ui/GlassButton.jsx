import React from 'react';
import { Loader2 } from 'lucide-react';

const GlassButton = ({ 
  children, 
  variant = 'primary', 
  loading = false, 
  isLoading = false, // Destructure this to prevent it from reaching the DOM
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "font-semibold py-2 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/30",
    danger: "bg-red-600 hover:bg-red-700 text-white hover:shadow-red-500/30",
    ghost: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    success: "bg-green-600 hover:bg-green-700 text-white hover:shadow-green-500/30"
  };

  const isBtnLoading = loading || isLoading;

  return (
    <button 
      className={`${baseStyles} ${variants[variant] || variants.primary} ${isBtnLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={isBtnLoading || disabled}
      {...props}
    >
      {isBtnLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export default GlassButton;
