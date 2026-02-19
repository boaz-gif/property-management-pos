
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/apiClient';
import PageHeader from '../../../components/ui/PageHeader';
import QuickPayCard from '../components/QuickPayCard';
import PaymentBreakdown from '../components/PaymentBreakdown';
import LoadingSpinner from '../../../components/LoadingSpinner';

const PayRent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [methods, setMethods] = useState([]);
  const [defaultMethod, setDefaultMethod] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, methodsRes] = await Promise.all([
        api.get('/tenant/rent-status'),
        api.get('/tenant/payment-methods')
      ]);
      
      setStatus(statusRes.data);
      setMethods(methodsRes.data);
      setDefaultMethod(methodsRes.data.find(m => m.is_default) || methodsRes.data[0]);
    } catch (err) {
      console.error('Failed to load rent status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!defaultMethod) {
        alert('Please add a payment method first');
        navigate('/tenant/payment-methods');
        return;
    }
    
    try {
        const res = await api.post('/tenant/payments/process', {
            amount: status.balance,
            paymentMethodId: defaultMethod.id
        });
        const result = res.data;
        if (result?.status === 'pending' && result?.payment_id) {
            setPendingPayment({ payment_id: result.payment_id, message: result.customer_message || 'Check your phone to complete the M-Pesa payment.' });
            pollPaymentStatus(result.payment_id);
            return;
        }

        alert('Payment successful!');
        fetchData();
    } catch (err) {
        console.error(err);
        alert('Payment failed: ' + err.response?.data?.message);
    }
  };

  const pollPaymentStatus = async (paymentId) => {
    const start = Date.now();
    const timeoutMs = 120000;

    const tick = async () => {
      try {
        const res = await api.get(`/tenant/payments/${paymentId}/status`);
        const s = res.data;
        if (s?.status === 'completed') {
          setPendingPayment(null);
          alert('Payment successful!');
          await fetchData();
          return;
        }
        if (s?.status === 'failed') {
          setPendingPayment(null);
          alert(`Payment failed: ${s?.result_desc || 'Please try again.'}`);
          return;
        }
      } catch (e) {
      }

      if (Date.now() - start >= timeoutMs) {
        setPendingPayment(null);
        alert('Payment is still pending. If you completed the STK prompt, refresh in a moment.');
        return;
      }

      setTimeout(tick, 3000);
    };

    setTimeout(tick, 2000);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title="Pay Rent" 
        breadcrumbs={[{ label: 'Tenant' }, { label: 'Pay Rent' }]}
      />
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
           <QuickPayCard 
             balance={status?.balance || 0}
             rentAmount={status?.rent_amount || 0}
             nextDueDate={status?.next_due_date}
             defaultPaymentMethod={defaultMethod}
             onPayNow={handlePayNow}
           />

           {pendingPayment && (
             <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
               <div className="font-semibold">M-Pesa payment initiated</div>
               <div className="text-sm mt-1">{pendingPayment.message}</div>
             </div>
           )}
           
           <div className="mt-6">
             <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-white">Payment Options</h3>
             <button 
                onClick={() => navigate('/tenant/payment-methods')}
                className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center"
             >
                <span className="text-gray-700 dark:text-gray-300">Manage Payment Methods</span>
                <span className="text-gray-400">→</span>
             </button>
           </div>
        </div>
        
        <div>
           <PaymentBreakdown breakdown={status?.breakdown} />
        </div>
      </div>
    </div>
  );
};

export default PayRent;
