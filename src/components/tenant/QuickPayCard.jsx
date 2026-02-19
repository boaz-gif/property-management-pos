
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../ui/GlassCard';
import { formatKES } from '../../utils/currency';

const QuickPayCard = ({ balance, rentAmount, nextDueDate, defaultPaymentMethod, onPayNow }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const daysUntilDue = nextDueDate 
    ? Math.ceil((new Date(nextDueDate) - new Date()) / (1000 * 60 * 60 * 24)) 
    : 0;

  const handlePay = async () => {
    setLoading(true);
    await onPayNow();
    setLoading(false);
  };

  return (
    <GlassCard className="p-6 relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            💳 Pay Rent
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Current Balance</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {formatKES(balance)}
          </div>
          {daysUntilDue > 0 ? (
            <div className="text-sm text-orange-500 font-medium">
              Due in {daysUntilDue} days ({new Date(nextDueDate).toLocaleDateString()})
            </div>
          ) : (
            <div className="text-sm text-red-500 font-medium">
              Overdue!
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 dark:text-gray-300">Payment Method</span>
            {defaultPaymentMethod ? (
                <span className="font-medium flex items-center gap-2">
                    {defaultPaymentMethod.brand} •••• {defaultPaymentMethod.last4}
                </span>
            ) : (
                <span className="text-red-500 text-sm">No default method</span>
            )}
        </div>
      </div>

      <button
        onClick={handlePay}
        disabled={loading || balance <= 0 || !defaultPaymentMethod}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {loading ? 'Processing...' : `PAY NOW ${formatKES(balance)}`}
      </button>

      <div className="flex justify-between gap-4">
        <button 
            onClick={() => navigate('/tenant/payments')}
            className="flex-1 py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
            View Breakdown
        </button>
        <button 
            onClick={() => navigate('/tenant/payments/autopay')}
            className="flex-1 py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
            Auto-Pay
        </button>
      </div>
    </GlassCard>
  );
};

export default QuickPayCard;
