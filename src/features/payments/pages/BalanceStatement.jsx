
import React, { useState, useEffect } from 'react';
import api from '../../../services/apiClient';
import PageHeader from '../../../components/ui/PageHeader';
import GlassCard from '../../../components/ui/GlassCard';
import LoadingSpinner from '../../../components/LoadingSpinner';

const BalanceStatement = () => {
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLedger = async () => {
            try {
                const response = await api.get('/tenant/balance-ledger');
                setLedger(response.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLedger();
    }, []);

    // Calculate running balance
    // Assuming backend returns transactions in DESC order
    // But for running balance, it's easier to process ASC.
    // Let's just list transactions for now.
    
    return (
        <div className="space-y-6">
            <PageHeader 
                title="Balance & Statements" 
                breadcrumbs={[{ label: 'Tenant' }, { label: 'Financials' }]}
            />
            
            {loading ? <LoadingSpinner /> : (
                <GlassCard p={false} className="overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Transaction Ledger</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm">
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium">Description</th>
                                    <th className="p-4 font-medium text-right">Amount</th>
                                    <th className="p-4 font-medium text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {ledger.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="p-4 text-gray-700 dark:text-gray-300">
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400">
                                            {item.type === 'payment' ? 'Payment Received' : item.description}
                                        </td>
                                        <td className={`p-4 font-medium text-right ${item.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.type === 'payment' ? '-' : '+'}${parseFloat(item.amount).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right text-gray-700 dark:text-gray-300">
                                            - {/* Calculate running balance if needed */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            )}
        </div>
    );
};

export default BalanceStatement;
