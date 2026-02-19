import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, MessageSquare, Clock, CheckCircle, AlertCircle, Calendar, User, Home, MapPin, Wrench } from 'lucide-react';
import { List } from 'react-window';
import api from '../../../services/apiClient';
import { useSocket } from '../../../context/SocketContext';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';
import PageHeader from '../../../components/ui/PageHeader';

const Maintenance = () => {
    const { on } = useSocket();
    const [requests, setRequests] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', priority: 'medium', description: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getCols = () => {
        if (windowWidth >= 1024) return 3; 
        if (windowWidth >= 768) return 2; 
        return 1;
    };

    const chunkArray = (arr, size) => {
        return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );
    };

    useEffect(() => {
        fetchRequests();

        on('maintenance_status_changed', (data) => {
            setRequests(prevRequests =>
                prevRequests.map(req =>
                    req.id === data.request_id
                        ? { ...req, status: data.new_status }
                        : req
                )
            );
        });

        on('maintenance_acknowledged', (data) => {
            setRequests(prevRequests =>
                prevRequests.map(req =>
                    req.id === data.request_id
                        ? { ...req, acknowledged: true, acknowledged_message: data.message }
                        : req
                )
            );
        });
    }, [on]);

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

    const filteredRequests = useMemo(() => {
        let filtered = requests;

        if (filter !== 'all') {
            filtered = filtered.filter(req => req.status === filter);
        }

        if (searchTerm) {
            filtered = filtered.filter(req =>
                req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return filtered;
    }, [requests, filter, searchTerm]);

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

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search requests..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                        className="w-full md:w-auto bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all" className="bg-gray-800">All Statuses</option>
                        <option value="pending_sync" className="bg-gray-800">Pending Sync</option>
                        <option value="in_progress" className="bg-gray-800">In Progress</option>
                        <option value="completed" className="bg-gray-800">Completed</option>
                    </select>
                </div>
            </div>

            <div className="h-[700px]">
                {filteredRequests.length > 0 ? (
                    (() => {
                        const cols = getCols();
                        const rows = chunkArray(filteredRequests, cols);

                        const Row = ({ index, style }) => {
                            const rowItems = rows[index];
                            return (
                                <div style={style} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                    {rowItems.map((request) => (
                                        <GlassCard
                                            key={request.id}
                                            className="group hover:border-blue-500/30 transition-all duration-300"
                                        >
                                            <div className="p-5 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className={`p-2 rounded-lg ${
                                                        request.priority === 'emergency' ? 'bg-red-500/10 text-red-500' :
                                                        request.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                                                        'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                        <AlertCircle className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                            request.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                            request.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                            'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                                        }`}>
                                                            {request.status.replace('_', ' ')}
                                                        </span>
                                                        <p className="text-[10px] text-gray-500 font-medium">#{request.id.slice(-6)}</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors">{request.title}</h4>
                                                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">{request.description}</p>
                                                </div>

                                                <div className="pt-4 border-t border-white/5 space-y-3">
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <Home className="h-3.5 w-3.5 text-blue-400" />
                                                        <span className="truncate">{request.property_name} • Unit {request.unit_number}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <User className="h-3.5 w-3.5 text-purple-400" />
                                                        <span>{request.tenant_name}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-4">
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                                            <Clock className="h-3 w-3" />
                                                            {request.created_at}
                                                        </div>
                                                        <GlassButton size="xs" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            View Details
                                                        </GlassButton>
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            );
                        };

                        return (
                            <List
                                height={700}
                                itemCount={rows.length}
                                itemSize={340} 
                                width="100%"
                            >
                                {Row}
                            </List>
                        );
                    })()
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 max-w-sm mx-auto">
                            <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white">No requests found</h3>
                            <p className="text-gray-400 mt-2">Try adjusting your filters or search terms.</p>
                        </div>
                    </div>
                )}
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

