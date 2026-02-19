import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building, Users, MapPin, Phone, Mail, Calendar,
  DollarSign, Wrench, FileText, Plus, ArrowLeft,
  Save, Archive, RotateCcw, XCircle, Trash2, AlertCircle,
  Clock, CheckCircle, Info, ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import { propertyAPI, authAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import PropertyImageUpload from '../../components/PropertyImageUpload';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import PageHeader from '../../components/ui/PageHeader';
import FilePreviewCard from '../../components/ui/FilePreviewCard';

const AdminPropertyDetail = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const isNewProperty = propertyId === 'new';

  const [property, setProperty] = useState({
    name: '',
    address: '',
    units: '',
    rent: '',
    description: '',
    status: 'active'
  });

  const [loading, setLoading] = useState(!isNewProperty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!isNewProperty) {
      fetchProperty();
    }
    fetchCurrentUser();
  }, [propertyId]);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getProfile();
      setCurrentUser(response.data.data?.user || response.data.user);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/properties/${propertyId}`);
      if (response.data?.data) {
        setProperty(response.data.data);
      } else {
        setError('Property data not found');
        setProperty({
          name: '',
          address: '',
          units: '',
          rent: '',
          description: '',
          status: 'active'
        });
      }
    } catch (err) {
      console.error('Error fetching property:', err);
      setError('Failed to load property');
      setProperty({
        name: '',
        address: '',
        units: '',
        rent: '',
        description: '',
        status: 'active'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProperty(prev => ({
      ...prev,
      [name]: name === 'units' || name === 'rent' ? parseFloat(value) || '' : value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!property.name || !property.address || !property.units || !property.rent) {
        setError('Please fill in all required fields');
        return;
      }

      if (isNewProperty) {
        const response = await api.post('/properties', property);
        setSuccess('Property created successfully!');
        // Redirect to the new property's detail page
        setTimeout(() => {
          navigate(`/admin/properties/${response.data.data.id}`);
        }, 1500);
      } else {
        await api.put(`/properties/${propertyId}`, property);
        setSuccess('Property updated successfully!');
        // Refresh property data
        setTimeout(() => {
          fetchProperty();
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving property:', err);
      setError(err.response?.data?.message || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    // Check for active tenants - using backend source of truth
    const occupiedUnits = parseInt(property.occupied) || 0;
    if (occupiedUnits > 0) {
      setError(`Cannot archive property with ${occupiedUnits} occupied unit${occupiedUnits > 1 ? 's' : ''}. Please reassign or archive tenants first.`);
      return;
    }

    if (!window.confirm('Are you sure you want to archive this property? You can restore it later.')) {
      return;
    }

    try {
      setSaving(true);
      await propertyAPI.archiveProperty(propertyId);
      setSuccess('Property archived successfully!');
      setTimeout(() => {
        navigate('/admin/properties');
      }, 1500);
    } catch (err) {
      console.error('Error archiving property:', err);
      setError(err.response?.data?.error || 'Failed to archive property');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('Are you sure you want to restore this property?')) {
      return;
    }

    try {
      setSaving(true);
      await propertyAPI.restoreProperty(propertyId);
      setSuccess('Property restored successfully!');
      setTimeout(() => {
        fetchProperty();
      }, 1500);
    } catch (err) {
      console.error('Error restoring property:', err);
      setError(err.response?.data?.error || 'Failed to restore property');
    } finally {
      setSaving(false);
    }
  };

  const handlePermanentDelete = async () => {
    const confirmText = prompt(
      '⚠️ DANGER: This will permanently delete this property and cannot be undone.\n\nType "DELETE" to confirm:'
    );

    if (confirmText !== 'DELETE') {
      return;
    }

    try {
      setSaving(true);
      await propertyAPI.permanentDeleteProperty(propertyId);
      setSuccess('Property permanently deleted!');
      setTimeout(() => {
        navigate('/admin/properties');
      }, 1500);
    } catch (err) {
      console.error('Error permanently deleting property:', err);
      setError(err.response?.data?.error || 'Failed to permanently delete property');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading property..." />;
  }

  return (
    <div className="text-white p-8 space-y-8">
      <PageHeader 
        title={isNewProperty ? 'Create New Property' : 'Edit Property'}
        breadcrumbs={[
            { label: 'Admin' }, 
            { label: 'Properties', href: '/admin/properties' },
            { label: isNewProperty ? 'New' : property.name }
        ]}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-400 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Archived Property Banner */}
      {property.deleted_at && (
        <GlassCard className="border-red-500/50 bg-red-500/5">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-500 mb-2">
                ⚠️ This property is archived
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Archived on {new Date(property.deleted_at).toLocaleDateString()} 
                {property.deleted_by_name && ` by ${property.deleted_by_name}`}
              </p>
              <div className="flex gap-4">
                <GlassButton
                  onClick={handleRestore}
                  disabled={saving}
                  variant="ghost"
                  className="border-green-500/20 text-green-400 hover:bg-green-500/10"
                >
                  <RotateCcw size={18} className="mr-2" />
                  Restore Property
                </GlassButton>
                {currentUser?.role === 'super_admin' && (
                  <GlassButton
                    onClick={handlePermanentDelete}
                    disabled={saving}
                    variant="danger"
                  >
                    <XCircle size={18} className="mr-2" />
                    Delete Permanently
                  </GlassButton>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          {/* Basic Information */}
          <GlassCard p={true}>
            <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>

            <div className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={property.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Downtown Apartment Complex"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={property.address}
                  onChange={handleInputChange}
                  placeholder="e.g., 123 Main Street, City, State 12345"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Units and Rent */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">
                    Number of Units <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="units"
                    value={property.units}
                    onChange={handleInputChange}
                    placeholder="e.g., 10"
                    min="1"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-400">
                    Rent per Unit <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      name="rent"
                      value={property.rent}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">Description</label>
                <textarea
                  name="description"
                  value={property.description || ''}
                  onChange={handleInputChange}
                  placeholder="Optional description of the property..."
                  rows="4"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">Status</label>
                <select
                  name="status"
                  value={property.status}
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active" className="bg-gray-800">Active</option>
                  <option value="inactive" className="bg-gray-800">Inactive</option>
                  <option value="maintenance" className="bg-gray-800">Maintenance</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
              {!property.deleted_at && (
                <>
                  <GlassButton
                    onClick={handleSave}
                    disabled={saving}
                    variant="primary"
                    className="flex-1 py-3"
                    isLoading={saving}
                  >
                    <Save size={20} className="mr-2" />
                    Save Property
                  </GlassButton>
                  {!isNewProperty && (
                    <GlassButton
                      onClick={handleArchive}
                      disabled={saving}
                      variant="ghost"
                      className="flex-1 py-3 border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                    >
                      <Archive size={20} className="mr-2" />
                      Archive
                    </GlassButton>
                  )}
                </>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Sidebar - Images (only show if property exists) */}
        {!isNewProperty && (
          <div className="lg:col-span-1">
            <GlassCard p={true}>
              <h2 className="text-xl font-bold text-white mb-6">Property Images</h2>
              <PropertyImageUpload
                propertyId={propertyId}
                onUploadComplete={() => {
                  setSuccess('Images updated successfully!');
                  setTimeout(() => setSuccess(''), 3000);
                }}
              />
            </GlassCard>
          </div>
        )}
      </div>

      {/* Note for new properties */}
      {isNewProperty && (
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
          <p className="text-blue-300 text-sm">
            💡 After creating the property, you'll be able to upload images in the next step.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminPropertyDetail;
