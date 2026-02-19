
import React, { useState, useEffect } from 'react';
import GlassCard from '../ui/GlassCard';

const AutoPayConfig = ({ config, paymentMethods, onSave, onDisable }) => {
  const [enabled, setEnabled] = useState(false);
  const [formData, setFormData] = useState({
    payment_method_id: '',
    day_of_month: 1,
    amount_type: 'full_balance',
    fixed_amount: ''
  });

  useEffect(() => {
    if (config) {
        setEnabled(config.is_enabled);
        setFormData({
            payment_method_id: config.payment_method_id,
            day_of_month: config.day_of_month,
            amount_type: config.amount_type,
            fixed_amount: config.fixed_amount || ''
        });
    } else if (paymentMethods.length > 0) {
        // Defaults
        const defaultMethod = paymentMethods.find(m => m.is_default) || paymentMethods[0];
        setFormData(prev => ({ ...prev, payment_method_id: defaultMethod.id }));
    }
  }, [config, paymentMethods]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave({ ...formData, is_enabled: enabled });
  };

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          ⚡ Auto-Pay
        </h2>
        <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
                {enabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <button 
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
      </div>

      <div className={`space-y-6 ${!enabled && 'opacity-50 pointer-events-none'}`}>
        {/* Schedule */}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule
            </label>
            <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Pay on the</span>
                <select
                    name="day_of_month"
                    value={formData.day_of_month}
                    onChange={handleChange}
                    className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                >
                    {[...Array(28)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}st</option> // Simplified suffix
                    ))}
                </select>
                <span className="text-gray-600 dark:text-gray-400">of each month</span>
            </div>
        </div>

        {/* Amount */}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
            </label>
            <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="amount_type" 
                        value="full_balance"
                        checked={formData.amount_type === 'full_balance'}
                        onChange={handleChange}
                        className="text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Full balance due</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="amount_type" 
                        value="rent_only"
                        checked={formData.amount_type === 'rent_only'}
                        onChange={handleChange}
                        className="text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Rent only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="amount_type" 
                        value="fixed_amount"
                        checked={formData.amount_type === 'fixed_amount'}
                        onChange={handleChange}
                        className="text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Custom amount (KES)</span>
                    <input 
                        type="number"
                        name="fixed_amount"
                        value={formData.fixed_amount}
                        onChange={handleChange}
                        disabled={formData.amount_type !== 'fixed_amount'}
                        className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600"
                    />
                </label>
            </div>
        </div>

        {/* Payment Method */}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method
            </label>
            <select
                name="payment_method_id"
                value={formData.payment_method_id}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
                {paymentMethods.map(m => (
                    <option key={m.id} value={m.id}>
                        {m.brand} •••• {m.last4} {m.nickname ? `(${m.nickname})` : ''}
                    </option>
                ))}
            </select>
        </div>

        <button 
            onClick={handleSave}
            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
            Save Configuration
        </button>
      </div>
    </GlassCard>
  );
};

export default AutoPayConfig;
