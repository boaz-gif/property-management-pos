import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, 
    Plus, 
    Home, 
    Users, 
    CheckCircle, 
    AlertCircle,
    Filter,
    ArrowUpRight,
    Building2,
    MapPin
} from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';
import { useProperties, usePropertyStats } from '../hooks/usePropertyQueries';

const AdminProperties = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // all, occupied, vacant, maintenance
    
    const { data: properties, isLoading, error } = useProperties({ 
        q: searchQuery,
        status: filter !== 'all' ? filter : undefined
    });
    
    const { data: stats } = usePropertyStats();

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            occupied: 'bg-green-500/10 text-green-500 border-green-500/20',
            vacant: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            maintenance: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
            archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
        };
        
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.vacant}`}>
                {status}
            </span>
        );
    };

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 inline-block">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                    <h3 className="text-white font-semibold">Failed to load properties</h3>
                    <p className="text-gray-400 text-sm mt-1">{error.message || 'Please check your connection'}</p>
                    <GlassButton onClick={() => window.location.reload()} className="mt-4" size="sm">Retry</GlassButton>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <PageHeader 
                title="Property Portfolio" 
                breadcrumbs={[{ label: 'Admin' }, { label: 'Properties' }]}
                actions={
                    <GlassButton 
                        variant="primary" 
                        onClick={() => navigate('/admin/properties/new')}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" /> Add Property
                    </GlassButton>
                }
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="p-5 flex items-center justify-between group hover:border-white/20 transition-all">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Properties</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stats?.total_properties || 0}</h3>
                    </div>
                    <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                        <Building2 className="h-5 w-5" />
                    </div>
                </GlassCard>
                <GlassCard className="p-5 flex items-center justify-between group hover:border-white/20 transition-all">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Occupancy Rate</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stats?.occupancy_rate || 0}%</h3>
                    </div>
                    <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500">
                        <Users className="h-5 w-5" />
                    </div>
                </GlassCard>
                <GlassCard className="p-5 flex items-center justify-between group hover:border-white/20 transition-all">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Units</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stats?.total_units || 0}</h3>
                    </div>
                    <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500">
                        <Home className="h-5 w-5" />
                    </div>
                </GlassCard>
                <GlassCard className="p-5 flex items-center justify-between group hover:border-white/20 transition-all">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Mnt. Requests</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stats?.active_maintenance || 0}</h3>
                    </div>
                    <div className="h-10 w-10 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                </GlassCard>
            </div>

            {/* Management Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input 
                        type="text"
                        placeholder="Search properties by name or address..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {['all', 'occupied', 'vacant', 'maintenance'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all border ${
                                filter === f 
                                    ? 'bg-white/10 border-white/20 text-white' 
                                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                    <GlassButton variant="ghost" size="sm" className="ml-2">
                        <Filter className="h-4 w-4" />
                    </GlassButton>
                </div>
            </div>

            {/* Properties Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <GlassCard key={i} className="h-80 animate-pulse bg-white/5" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties?.data?.map((property) => (
                        <GlassCard 
                            key={property.id} 
                            onClick={() => navigate(`/admin/properties/${property.id}`)}
                            className="group cursor-pointer overflow-hidden border-white/5 hover:border-blue-500/30 transition-all duration-300 hover:translate-y-[-4px]"
                        >
                            <div className="relative h-48 bg-gray-800">
                                {property.images?.[0] ? (
                                    <img 
                                        src={property.images[0]} 
                                        alt={property.name} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Building2 className="h-12 w-12 text-gray-700" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3">
                                    <StatusBadge status={property.status} />
                                </div>
                                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                    <h4 className="text-lg font-bold text-white truncate">{property.name}</h4>
                                    <div className="flex items-center gap-1 text-gray-300 text-xs mt-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">{property.address}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Units</p>
                                        <p className="text-sm font-semibold text-white">{property.total_units || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Average Rent</p>
                                        <p className="text-sm font-semibold text-white">${property.avg_rent?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-24 bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500 transition-all" 
                                                style={{ width: `${(property.occupied_units / property.total_units) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">
                                            {Math.round((property.occupied_units / property.total_units) * 100)}%
                                        </span>
                                    </div>
                                    <ArrowUpRight className="h-4 w-4 text-gray-600 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                    
                    {properties?.data?.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <div className="bg-white/5 rounded-2xl p-8 border border-white/10 max-w-sm mx-auto">
                                <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white">No properties found</h3>
                                <p className="text-gray-400 mt-2">Try adjusting your search or filters to find what you're looking for.</p>
                                <GlassButton 
                                    className="mt-6" 
                                    variant="primary"
                                    onClick={() => { setSearchQuery(''); setFilter('all'); }}
                                >
                                    Clear Filters
                                </GlassButton>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminProperties;
