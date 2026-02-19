
import React, { useState, useEffect } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import api from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';
import PageHeader from '../../components/ui/PageHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatKES } from '../../utils/currency';

const PaymentHistory = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, completed, pending

    useEffect(() => {
        fetchPayments();
    }, [filter]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filter !== 'all') params.status = filter;
            
            const response = await api.get('/tenant/payments/history', { params });
            setPayments(response.data || []);
        } catch (err) {
            console.error('Error fetching payments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReceipt = (pdfUrl) => {
        if (!pdfUrl) return;
        // In real app, this would be a direct link or a signed URL
        // Here we assume backend serves uploads statically or via download endpoint
        // If pdfUrl is relative:
        const apiBase = process.env.REACT_APP_API_URL || '/api';
        const backendBase = apiBase.startsWith('/') ? window.location.origin : apiBase.replace(/\/api\/?$/, '');
        window.open(`${backendBase}/${pdfUrl}`, '_blank');
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Payment History" 
                breadcrumbs={[{ label: 'Tenant' }, { label: 'Payments' }, { label: 'History' }]}
            />

            <div className="flex justify-between items-center">
                <div className="relative">
                    <select 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>
                    <Filter className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                
                {/* Search could go here */}
            </div>

            {loading ? <LoadingSpinner /> : (
                <GlassCard p={false} className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium">Description</th>
                                    <th className="p-4 font-medium">Amount</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium text-right">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {payments.length > 0 ? payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="p-4 text-gray-700 dark:text-gray-300">
                                            {new Date(payment.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400">
                                            {payment.type === 'rent' ? 'Rent Payment' : payment.type}
                                            <div className="text-xs text-gray-500 capitalize">{payment.method}</div>
                                        </td>
                                        <td className="p-4 font-medium text-gray-900 dark:text-white">
                                            {formatKES(parseFloat(payment.amount))}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                payment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {payment.pdf_url && (
                                                <button 
                                                    onClick={() => handleDownloadReceipt(payment.pdf_url)}
                                                    className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                                    title="Download Receipt"
                                                >
                                                    <Download className="h-5 w-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">
                                            No payment history found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            )}
        </div>
    );
};

export default PaymentHistory;
