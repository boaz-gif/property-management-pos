
import React from 'react';
import GlassCard from '../ui/GlassCard';

const PaymentMethodCard = ({ method, onSetDefault, onDelete }) => {
  return (
    <GlassCard className="p-4 relative group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs font-bold text-gray-500">
            {method.brand}
          </div>
          <div>
            <div className="font-medium text-gray-800 dark:text-white flex items-center gap-2">
              •••• {method.last4}
              {method.is_default && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-bold">
                  DEFAULT
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {method.nickname || 'Payment Method'}
            </div>
          </div>
        </div>
        
        <div className="relative">
           {/* Dropdown would go here, for now simple buttons */}
           {!method.is_default && (
               <button 
                onClick={() => onSetDefault(method.id)}
                className="text-xs text-blue-600 hover:text-blue-800 mr-2"
               >
                   Set Default
               </button>
           )}
           <button 
            onClick={() => onDelete(method.id)}
            className="text-xs text-red-600 hover:text-red-800"
           >
               Remove
           </button>
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-xs text-green-600">
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        Verified
      </div>
    </GlassCard>
  );
};

export default PaymentMethodCard;
