import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, 
    Save, 
    Building2, 
    Home, 
    MapPin, 
    DollarSign,
    Info,
    Trash2,
    Plus,
    X,
    Layout
} from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';
import PropertyImageUpload from '../components/PropertyImageUpload';
import { useProperty, useCreateProperty, useUpdateProperty } from '../hooks/usePropertyQueries';

const AdminPropertyDetail = () => {
    const { propertyId } = useParams();
    const isNew = !propertyId;
    const navigate = useNavigate();
    
    const { data: property, isLoading: isFetching } = useProperty(propertyId);
    const createProperty = useCreateProperty();
    const updateProperty = useUpdateProperty();

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        type: 'residential',
        status: 'vacant',
        total_units: 1,
        occupied_units: 0,
        avg_rent: 0,
        amenities: [],
        description: '',
        images: []
    });

    const [newAmenity, setNewAmenity] = useState('');

    useEffect(() => {
        if (property && !isNew) {
            setFormData({
                ...property,
                amenities: property.amenities || [],
                images: property.images || []
            });
        }
    }, [property, isNew]);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleAddAmenity = (e) => {
        if (e.key === 'Enter' && newAmenity.trim()) {
            e.preventDefault();
            if (!formData.amenities.includes(newAmenity.trim())) {
                setFormData(prev => ({
                    ...prev,
                    amenities: [...prev.amenities, newAmenity.trim()]
                }));
            }
            setNewAmenity('');
        }
    };

    const removeAmenity = (index) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.filter((_, i) => i !== index)
        }));
    };

    const handleUploadImages = (files) => {
        // In a real app, you'd upload these to a server and get URLs back
        // For now, we'll just simulate with local URLs
        const newImages = files.map(file => URL.createObjectURL(file));
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...newImages].slice(0, 5)
        }));
    };

    const handleRemoveImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isNew) {
                await createProperty.mutateAsync(formData);
            } else {
                await updateProperty.mutateAsync({ id: propertyId, data: formData });
            }
            navigate('/admin/properties');
        } catch (err) {
            console.error('Failed to save property:', err);
        }
    };

    if (isFetching && !isNew) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Loading property details...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <PageHeader 
                title={isNew ? "Add New Property" : `Edit ${formData.name}`}
                breadcrumbs={[
                    { label: 'Admin' },
                    { label: 'Properties', href: '/admin/properties' },
                    { label: isNew ? 'New' : formData.name }
                ]}
                actions={
                    <div className="flex gap-3">
                        <GlassButton 
                            variant="ghost" 
                            onClick={() => navigate('/admin/properties')}
                        >
                            Cancel
                        </GlassButton>
                        <GlassButton 
                            variant="primary" 
                            onClick={handleSubmit}
                            isLoading={createProperty.isLoading || updateProperty.isLoading}
                            className="flex items-center gap-2"
                        >
                            <Save className="h-4 w-4" /> Save Property
                        </GlassButton>
                    </div>
                }
            />

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-8">
                    <GlassCard className="p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                <Info className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">General Information</h3>
                                <p className="text-xs text-gray-500">Enter essential property details</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Property Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <input
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Grand Heights"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Property Type</label>
                                <div className="relative">
                                    <Layout className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 shadow-xl" />
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                                    >
                                        <option value="residential">Residential</option>
                                        <option value="commercial">Commercial</option>
                                        <option value="industrial">Industrial</option>
                                        <option value="land">Land</option>
                                    </select>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-400">Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <input
                                        name="address"
                                        required
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="123 Luxury Way"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Description</label>
                            <textarea
                                name="description"
                                rows={4}
                                value={formData.description}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="Tell us about the property..."
                            />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <PropertyImageUpload 
                            images={formData.images}
                            onUpload={handleUploadImages}
                            onRemove={handleRemoveImage}
                        />
                    </GlassCard>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    <GlassCard className="p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                                < DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Financials & Units</h3>
                                <p className="text-[10px] text-gray-500">Set pricing and capacity</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Average Rent</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <input
                                        type="number"
                                        name="avg_rent"
                                        value={formData.avg_rent}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Units</label>
                                    <div className="relative">
                                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <input
                                            type="number"
                                            name="total_units"
                                            value={formData.total_units}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Occupied</label>
                                    <div className="relative">
                                        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <input
                                            type="number"
                                            name="occupied_units"
                                            value={formData.occupied_units}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 space-y-6">
                        <h4 className="text-sm font-semibold text-white">Amenities</h4>
                        <div className="space-y-4">
                            <div className="relative">
                                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <input
                                    value={newAmenity}
                                    onChange={(e) => setNewAmenity(e.target.value)}
                                    onKeyDown={handleAddAmenity}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="Add amenity (press Enter)"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.amenities.map((item, index) => (
                                    <span 
                                        key={index}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 group"
                                    >
                                        {item}
                                        <button 
                                            type="button"
                                            onClick={() => removeAmenity(index)}
                                            className="p-0.5 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                                {formData.amenities.length === 0 && (
                                    <p className="text-xs text-gray-600 italic">No amenities added yet</p>
                                )}
                            </div>
                        </div>
                    </GlassCard>

                    {!isNew && (
                        <GlassCard className="p-6 border-red-500/20">
                            <h4 className="text-sm font-semibold text-red-500">Danger Zone</h4>
                            <p className="text-[10px] text-gray-500 mt-1">Actions here are permanent</p>
                            <GlassButton 
                                variant="ghost" 
                                className="w-full mt-4 border-red-500/20 text-red-500 hover:bg-red-500/10"
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Property
                            </GlassButton>
                        </GlassCard>
                    )}
                </div>
            </form>
        </div>
    );
};

export default AdminPropertyDetail;
