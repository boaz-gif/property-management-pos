import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Calendar, Users, Plus, Download, Filter, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../../../services/apiClient';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';
import PageHeader from '../../../components/ui/PageHeader';
import VirtualTable from '../../../components/ui/VirtualTable';

const AdminPayments = () => {
    const [payments, setPayments] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('credit_card');

    // Fetch payments and tenants from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [paymentsResponse, tenantsResponse] = await Promise.all([
                    api.get('/payments'),
                    api.get('/tenants')
                ]);
                setPayments(paymentsResponse.data.data || []);
                setTenants(tenantsResponse.data.data || []);
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        try {
            const tenant = tenants.find(t => t.id === parseInt(selectedTenant));
            if (!tenant) {
                alert('Please select a valid tenant');
                return;
            }

            await api.post('/payments', {
                tenantId: tenant.id,
                amount: parseFloat(amount),
                method,
                type: 'rent'
            });

            setSelectedTenant('');
            setAmount('');
            setMethod('credit_card');
            setShowModal(false);

            // Refresh payments list
            const response = await api.get('/payments');
            setPayments(response.data.data || []);
        } catch (err) {
            console.error('Error processing payment:', err);
            alert('Failed to process payment');
        }
    };

    if (loading) {
        return <div className="text-white text-center p-8">Loading payments...</div>;
    }

    return (
        <div className="text-white p-8 space-y-8">
            <PageHeader 
                title="Payment Management" 
                breadcrumbs={[{ label: 'Admin' }, { label: 'Payments' }]}
                actions={
                    <GlassButton
                        onClick={() => setShowModal(true)}
                        variant="primary"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Record Payment
                    </GlassButton>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-500/20">
                            <DollarSign className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Revenue</p>
                            <p className="text-2xl font-bold">
                                ${payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-green-500/20">
                            <CreditCard className="h-6 w-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Payments</p>
                            <p className="text-2xl font-bold">{payments.length}</p>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-purple-500/20">
                            <Users className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Active Tenants</p>
                            <p className="text-2xl font-bold">{tenants.length}</p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">All Payments</h3>
                </div>
                
                <VirtualTable
                    items={payments}
                    height={600}
                    itemSize={70}
                    columns={[
                        {
                            header: 'Tenant',
                            render: (p) => p.tenant_name || 'Unknown Tenant',
                            width: '25%'
                        },
                        {
                            header: 'Date',
                            render: (p) => (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    {p.date}
                                </div>
                            ),
                            width: '20%'
                        },
                        {
                            header: 'Amount',
                            render: (p) => (
                                <span className="font-medium text-blue-400">
                                    ${parseFloat(p.amount).toFixed(2)}
                                </span>
                            ),
                            width: '15%'
                        },
                        {
                            header: 'Method',
                            render: (p) => (
                                <span className="text-gray-300 capitalize">
                                    {p.method.replace('_', ' ')}
                                </span>
                            ),
                            width: '20%'
                        },
                        {
                            header: 'Status',
                            render: (p) => (
                                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/20">
                                    {p.status}
                                </span>
                            ),
                            width: '20%'
                        }
                    ]}
                />
            </div>


            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <GlassCard className="w-full max-w-md p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Record Payment</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                &times;
                            </button>
                        </div>
                        
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Tenant</label>
                                <select
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedTenant}
                                    onChange={(e) => setSelectedTenant(e.target.value)}
                                >
                                    <option value="" className="bg-gray-800">Select Tenant</option>
                                    {tenants.map((tenant) => (
                                        <option key={tenant.id} value={tenant.id} className="bg-gray-800">
                                            {tenant.name} - Unit {tenant.unit_number || 'N/A'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Amount</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Payment Method</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                >
                                    <option value="credit_card" className="bg-gray-800">Credit Card</option>
                                    <option value="bank_transfer" className="bg-gray-800">Bank Transfer</option>
                                    <option value="cash" className="bg-gray-800">Cash</option>
                                    <option value="check" className="bg-gray-800">Check</option>
                                </select>
                            </div>

                            <GlassButton type="submit" variant="primary" className="w-full py-3">
                                Record Payment
                            </GlassButton>
                        </form>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

export default AdminPayments;