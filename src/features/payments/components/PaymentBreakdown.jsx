
import React from 'react';
import GlassCard from '../../../components/ui/GlassCard';
import { formatKES } from '../../../utils/currency';

const PaymentBreakdown = ({ breakdown }) => {
  if (!breakdown) return null;

  const { base_rent, fees, credits, total_due } = breakdown;

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Payment Breakdown</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
          <span>Base Rent</span>
          <span>{formatKES(base_rent)}</span>
        </div>
        
        {fees > 0 && (
          <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
            <span>Fees & Charges</span>
            <span>{formatKES(fees)}</span>
          </div>
        )}
        
        {credits > 0 && (
          <div className="flex justify-between items-center text-green-600 dark:text-green-400">
            <span>Credits</span>
            <span>-{formatKES(credits)}</span>
          </div>
        )}
        
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-4"></div>
        
        <div className="flex justify-between items-center font-bold text-lg text-gray-800 dark:text-white">
          <span>Total Due</span>
          <span>{formatKES(total_due)}</span>
        </div>
      </div>
    </GlassCard>
  );
};

export default PaymentBreakdown;
