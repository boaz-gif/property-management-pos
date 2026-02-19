
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import PaymentMethodCard from '../../components/tenant/PaymentMethodCard';
import AddPaymentMethod from '../../components/tenant/AddPaymentMethod';
import LoadingSpinner from '../../components/LoadingSpinner';

const PaymentMethods = () => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        try {
            setLoading(true);
            const response = await api.get('/tenant/payment-methods');
            setMethods(response.data || []);
        } catch (err) {
            console.error('Error fetching methods:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMethod = async (data) => {
        try {
            await api.post('/tenant/payment-methods', data);
            await fetchMethods();
        } catch (err) {
            console.error(err);
            alert('Failed to add payment method');
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await api.put(`/tenant/payment-methods/${id}/default`);
            await fetchMethods();
        } catch (err) {
            console.error(err);
            alert('Failed to set default');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this payment method?')) return;
        
        try {
            await api.delete(`/tenant/payment-methods/${id}`);
            await fetchMethods();
        } catch (err) {
            console.error(err);
            alert('Failed to delete: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <PageHeader 
                title="Payment Methods" 
                breadcrumbs={[{ label: 'Tenant' }, { label: 'Payments' }, { label: 'Methods' }]}
            />

            <div className="flex justify-end">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Method
                </button>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="grid md:grid-cols-2 gap-4">
                    {methods.map(method => (
                        <PaymentMethodCard 
                            key={method.id} 
                            method={method} 
                            onSetDefault={handleSetDefault}
                            onDelete={handleDelete}
                        />
                    ))}
                    
                    {methods.length === 0 && (
                        <div className="col-span-2 text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400">No payment methods saved yet.</p>
                        </div>
                    )}
                </div>
            )}

            {showAddModal && (
                <AddPaymentMethod 
                    onClose={() => setShowAddModal(false)}
                    onAdd={handleAddMethod}
                />
            )}
        </div>
    );
};

export default PaymentMethods;
