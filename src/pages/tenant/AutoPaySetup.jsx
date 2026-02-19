
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import AutoPayConfig from '../../components/tenant/AutoPayConfig';
import LoadingSpinner from '../../components/LoadingSpinner';

const AutoPaySetup = () => {
    const [config, setConfig] = useState(null);
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [configRes, methodsRes] = await Promise.all([
                api.get('/tenant/autopay').catch(() => ({ data: null })), // might be 404 or empty
                api.get('/tenant/payment-methods')
            ]);
            
            setConfig(configRes.data);
            setMethods(methodsRes.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        try {
            if (data.is_enabled === false && config?.is_enabled) {
                // If turning off
                await api.put('/tenant/autopay/disable');
            } else {
                // Setup/Update
                await api.post('/tenant/autopay/setup', data);
            }
            alert('Auto-Pay configuration saved successfully!');
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to save configuration: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <PageHeader 
                title="Auto-Pay Setup" 
                breadcrumbs={[{ label: 'Tenant' }, { label: 'Payments' }, { label: 'Auto-Pay' }]}
            />
            
            {methods.length === 0 ? (
                 <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-800 dark:text-yellow-200">
                     You need to add a payment method before setting up Auto-Pay.
                 </div>
            ) : (
                <AutoPayConfig 
                    config={config} 
                    paymentMethods={methods} 
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default AutoPaySetup;
