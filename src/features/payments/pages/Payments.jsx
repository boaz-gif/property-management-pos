import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Calendar, Download } from 'lucide-react';
import api from '../../../services/apiClient';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';
import PageHeader from '../../../components/ui/PageHeader';

const Payments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch payments from API
    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const response = await api.get('/payments');
                setPayments(response.data.data || []);
            } catch (err) {
                console.error('Error fetching payments:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, []);

    const handleDownloadReceipt = async (paymentId) => {
        try {
            // 1. Generate receipt
            const response = await api.post(`/payments/${paymentId}/receipt`);
            const receipt = response.data.data;
            
            // 2. Download file
            const blobResponse = await api.get(`/documents/${receipt.id}/download`, { 
                responseType: 'blob' 
            });
            
            // 3. Trigger browser download
            const url = window.URL.createObjectURL(new Blob([blobResponse.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', receipt.name || `receipt_${paymentId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
        } catch (err) {
            console.error('Error downloading receipt:', err);
            alert('Failed to download receipt.');
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader 
                title="Payments" 
                breadcrumbs={[{ label: 'Tenant' }, { label: 'Payments' }]}
            />

            <GlassCard p={false} className="overflow-hidden">
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white">Payment History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-sm">
                                <th className="p-4 font-medium">Date</th>
                                <th className="p-4 font-medium">Amount</th>
                                <th className="p-4 font-medium">Method</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {payments.map((payment) => (
                                <tr key={payment.id} className="text-white hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            {payment.date}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-blue-400">${parseFloat(payment.amount).toFixed(2)}</td>
                                    <td className="p-4 text-gray-300 capitalize">{payment.method.replace('_', ' ')}</td>
                                    <td className="p-4">
                                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/20">
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {payment.status === 'completed' && (
                                            <GlassButton 
                                                onClick={() => handleDownloadReceipt(payment.id)}
                                                variant="ghost"
                                                className="p-2 rounded-full border-none hover:bg-white/10"
                                                title="Download Receipt"
                                            >
                                                <Download className="h-4 w-4" />
                                            </GlassButton>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};

export default Payments;
