import React, { useState, useEffect } from 'react';
import { Wrench, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../../../services/apiClient';
import { useSocket } from '../../../context/SocketContext';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';
import PageHeader from '../../../components/ui/PageHeader';

const Maintenance = () => {
    const { on, emit } = useSocket();
    const [requests, setRequests] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', priority: 'medium', description: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRequests();

        // Listen for real-time status updates
        on('maintenance_status_changed', (data) => {
            setRequests(prevRequests =>
                prevRequests.map(req =>
                    req.id === data.request_id
                        ? { ...req, status: data.new_status }
                        : req
                )
            );
        });

        // Listen for maintenance acknowledgments
        on('maintenance_acknowledged', (data) => {
            setRequests(prevRequests =>
                prevRequests.map(req =>
                    req.id === data.request_id
                        ? { ...req, acknowledged: true, acknowledged_message: data.message }
                        : req
                )
            );
        });

        return () => {
            // Cleanup listeners if needed
        };
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await api.get('/maintenance');
            setRequests(response.data.data || []);
        } catch (err) {
            console.error('Error fetching maintenance requests:', err);
            setError('Failed to load maintenance requests');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/maintenance', formData);
            setFormData({ title: '', priority: 'medium', description: '' });
            setShowModal(false);
            if (response.status === 202 || response.data?.queued) {
                const queuedId = response.data?.id || Date.now().toString();
                setRequests(prev => ([
                    {
                        id: `pending-${queuedId}`,
                        title: formData.title,
                        priority: formData.priority,
                        description: formData.description,
                        status: 'pending_sync',
                        date: new Date().toLocaleDateString()
                    },
                    ...prev
                ]));
            } else {
                fetchRequests();
            }
        } catch (err) {
            console.error('Error creating maintenance request:', err);
            setError('Failed to create maintenance request');
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'text-red-400 bg-red-500/20';
            case 'medium': return 'text-orange-400 bg-orange-500/20';
            case 'low': return 'text-blue-400 bg-blue-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending_sync': return <AlertCircle className="h-4 w-4 text-yellow-400" />;
            case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />;
            case 'in_progress': return <Wrench className="h-4 w-4 text-orange-400" />;
            default: return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    if (loading) {
        return <div className="text-white text-center">Loading maintenance requests...</div>;
    }

    if (error) {
        return <div className="text-red-400 text-center">{error}</div>;
    }

    return (
        <div className="space-y-8">
            <PageHeader 
                title="Maintenance" 
                breadcrumbs={[{ label: 'Tenant' }, { label: 'Maintenance' }]}
                actions={
                    <GlassButton 
                        onClick={() => setShowModal(true)}
                        variant="primary"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Request
                    </GlassButton>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.map((req) => (
                    <GlassCard key={req.id} className="hover:bg-white/5 transition-all cursor-pointer group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                <Wrench className="h-6 w-6 text-white" />
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(req.priority)}`}>
                                {req.priority.toUpperCase()}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{req.title}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-4">{req.description}</p>
                        <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-white/10">
                            <span className="flex items-center gap-2">
                                {getStatusIcon(req.status)}
                                <span className="capitalize">{req.status.replace('_', ' ')}</span>
                            </span>
                            <span>{req.date}</span>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <GlassCard className="w-full max-w-md p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">New Maintenance Request</h2>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                &times;
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Issue Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Leaky Faucet"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Priority</label>
                                <select 
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                >
                                    <option value="low" className="bg-gray-800">Low</option>
                                    <option value="medium" className="bg-gray-800">Medium</option>
                                    <option value="high" className="bg-gray-800">High</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Description</label>
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Describe the issue in detail..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                            <GlassButton type="submit" variant="primary" className="w-full py-3">
                                Submit Request
                            </GlassButton>
                        </form>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

export default Maintenance;
