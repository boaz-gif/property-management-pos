import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock, Loader, Edit2, DollarSign, Users, Building, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import './AdminLeaseManagement.css';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import PageHeader from '../../components/ui/PageHeader';

const AdminLeaseManagement = () => {
  const [leaseStats, setLeaseStats] = useState(null);
  const [expiringLeases, setExpiringLeases] = useState([]);
  const [expiredLeases, setExpiredLeases] = useState([]);
  const [activeTab, setActiveTab] = useState('stats'); // stats, expiring, expired
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [daysThreshold, setDaysThreshold] = useState(30);
  const [selectedLease, setSelectedLease] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    lease_start_date: '',
    lease_end_date: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // Fetch lease statistics
  useEffect(() => {
    fetchLeaseStats();
  }, []);

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'expiring') {
      fetchExpiringLeases();
    } else if (activeTab === 'expired') {
      fetchExpiredLeases();
    }
  }, [activeTab, daysThreshold]);

  const fetchLeaseStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenants/lease/stats');
      setLeaseStats(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load lease statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiringLeases = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tenants/lease/expiring?days=${daysThreshold}`);
      setExpiringLeases(response.data.data?.leases || response.data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load expiring leases');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiredLeases = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenants/lease/expired');
      setExpiredLeases(response.data.data?.leases || response.data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load expired leases');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (lease) => {
    setSelectedLease(lease);
    setEditData({
      lease_start_date: lease.lease_start_date || '',
      lease_end_date: lease.lease_end_date || ''
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedLease(null);
    setEditData({
      lease_start_date: '',
      lease_end_date: ''
    });
  };

  const handleSaveLease = async () => {
    if (!selectedLease || !editData.lease_start_date || !editData.lease_end_date) {
      setError('Please fill in all fields');
      return;
    }

    if (new Date(editData.lease_start_date) >= new Date(editData.lease_end_date)) {
      setError('Lease start date must be before end date');
      return;
    }

    try {
      setEditLoading(true);
      await api.put(`/tenants/${selectedLease.id}/lease`, editData);
      setError(null);
      closeEditModal();
      
      // Refresh data
      if (activeTab === 'expiring') {
        await fetchExpiringLeases();
      } else if (activeTab === 'expired') {
        await fetchExpiredLeases();
      }
      await fetchLeaseStats();
    } catch (err) {
      setError('Failed to update lease');
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleRenewLease = async (tenantId) => {
    try {
      setEditLoading(true);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await api.post(`/tenants/${tenantId}/lease/renew`, {
        lease_end_date: futureDate.toISOString().split('T')[0]
      });

      setError(null);
      closeEditModal();

      // Refresh data
      await fetchExpiringLeases();
      await fetchExpiredLeases();
      await fetchLeaseStats();
    } catch (err) {
      setError('Failed to renew lease');
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'expiring_soon':
        return 'status-expiring';
      case 'expired':
        return 'status-expired';
      default:
        return 'status-unknown';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} />;
      case 'expiring_soon':
        return <AlertCircle size={16} />;
      case 'expired':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <GlassCard className={`relative overflow-hidden group`}>
       <div className="flex items-center gap-4">
          <div className={`p-4 rounded-xl bg-white/5 ${color.replace('card-', 'text-')}`}>
            <Icon size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value || 0}</p>
          </div>
       </div>
    </GlassCard>
  );

  const LeaseRow = ({ lease, onEdit, onRenew, showAction = true }) => (
    <tr key={lease.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-4 px-4 font-medium text-white">{lease.name || 'N/A'}</td>
      <td className="py-4 px-4 text-gray-400">{lease.property_name || 'N/A'}</td>
      <td className="py-4 px-4 text-gray-400">{lease.unit || 'N/A'}</td>
      <td className="py-4 px-4 text-gray-400">
        {lease.lease_start_date ? new Date(lease.lease_start_date).toLocaleDateString() : 'Not set'}
      </td>
      <td className="py-4 px-4 text-gray-400">
        {lease.lease_end_date ? new Date(lease.lease_end_date).toLocaleDateString() : 'Not set'}
      </td>
      <td className="py-4 px-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          lease.lease_status === 'active' ? 'bg-green-500/20 text-green-400' :
          lease.lease_status === 'expiring_soon' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {getStatusIcon(lease.lease_status)}
          <span>{lease.lease_status ? lease.lease_status.replace('_', ' ') : 'Unknown'}</span>
        </span>
      </td>
      {showAction && (
        <td className="py-4 px-4 text-right">
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" className="px-3 py-1 text-sm" onClick={() => onEdit(lease)}>
              <Edit2 size={14} className="mr-1" />
              Edit
            </GlassButton>
            {lease.lease_status === 'expired' && (
              <GlassButton variant="success" className="px-3 py-1 text-sm" onClick={() => onRenew(lease.id)}>
                <CheckCircle size={14} className="mr-1" />
                Renew
              </GlassButton>
            )}
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="admin-lease-management p-8 space-y-8">
      <PageHeader 
        title="Lease Management" 
        breadcrumbs={[{ label: 'Admin' }, { label: 'Leases' }]}
      />

      {error && (
        <div className="alert alert-error bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="close-btn text-xl">&times;</button>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="lease-stats">
          {loading ? (
            <div className="loading-state">
              <Loader className="spinner" />
              <p>Loading lease statistics...</p>
            </div>
          ) : leaseStats ? (
            <div className="stats-grid">
              <StatCard
                title="Total Active Leases"
                value={leaseStats.total_active_leases}
                icon={CheckCircle}
                color="card-active"
              />
              <StatCard
                title="Expiring Soon (30 days)"
                value={leaseStats.expiring_soon}
                icon={AlertCircle}
                color="card-warning"
              />
              <StatCard
                title="Expired Leases"
                value={leaseStats.expired}
                icon={XCircle}
                color="card-danger"
              />
              <StatCard
                title="No Lease Set"
                value={leaseStats.no_lease}
                icon={Clock}
                color="card-info"
              />
            </div>
          ) : null}

          <div className="flex gap-4">
            <GlassButton
              variant={activeTab === 'expiring' ? 'primary' : 'ghost'}
              onClick={() => setActiveTab('expiring')}
            >
              View Expiring Leases
            </GlassButton>
            <GlassButton
              variant={activeTab === 'expired' ? 'primary' : 'ghost'}
              onClick={() => setActiveTab('expired')}
            >
              View Expired Leases
            </GlassButton>
          </div>
        </div>
      )}

      {/* Expiring Leases Tab */}
      {activeTab === 'expiring' && (
        <div className="lease-table-section">
          <div className="section-header">
            <h2>Leases Expiring Soon</h2>
            <div className="days-filter">
              <label>Expiring in:</label>
              <select
                value={daysThreshold}
                onChange={(e) => setDaysThreshold(Number(e.target.value))}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <Loader className="spinner" />
              <p>Loading leases...</p>
            </div>
          ) : expiringLeases.length > 0 ? (
            <div className="table-wrapper">
              <table className="leases-table">
                <thead>
                  <tr>
                    <th>Tenant Name</th>
                    <th>Property</th>
                    <th>Unit</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringLeases.map(lease => (
                    <LeaseRow
                      key={lease.id}
                      lease={lease}
                      onEdit={openEditModal}
                      onRenew={handleRenewLease}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <CheckCircle size={48} />
              <h3>No Expiring Leases</h3>
              <p>Great! No leases are expiring within the selected timeframe.</p>
            </div>
          )}
        </div>
      )}

      {/* Expired Leases Tab */}
      {activeTab === 'expired' && (
        <div className="lease-table-section">
          <div className="section-header">
            <h2>Expired Leases</h2>
            <p className="section-subtitle">These leases have ended and may need renewal</p>
          </div>

          {loading ? (
            <div className="loading-state">
              <Loader className="spinner" />
              <p>Loading leases...</p>
            </div>
          ) : expiredLeases.length > 0 ? (
            <div className="table-wrapper">
              <table className="leases-table">
                <thead>
                  <tr>
                    <th>Tenant Name</th>
                    <th>Property</th>
                    <th>Unit</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredLeases.map(lease => (
                    <LeaseRow
                      key={lease.id}
                      lease={lease}
                      onEdit={openEditModal}
                      onRenew={handleRenewLease}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <CheckCircle size={48} />
              <h3>No Expired Leases</h3>
              <p>All tenant leases are current or within valid dates.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedLease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeEditModal}>
          <GlassCard className="w-full max-w-md p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit Lease - {selectedLease.name}</h2>
              <button className="text-gray-400 hover:text-white text-2xl" onClick={closeEditModal}>&times;</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Lease Start Date</label>
                <input
                  type="date"
                  value={editData.lease_start_date}
                  onChange={(e) => setEditData({ ...editData, lease_start_date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Lease End Date</label>
                <input
                  type="date"
                  value={editData.lease_end_date}
                  onChange={(e) => setEditData({ ...editData, lease_end_date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
                <p className="text-sm text-gray-400"><strong>Current Status:</strong> <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(selectedLease.lease_status)}`}>{selectedLease.lease_status}</span></p>
                <p className="text-sm text-gray-400"><strong>Current End Date:</strong> <span className="text-white ml-2">{new Date(selectedLease.lease_end_date).toLocaleDateString()}</span></p>
              </div>
            </div>

            <div className="flex gap-4">
              <GlassButton
                className="flex-1"
                variant="ghost"
                onClick={closeEditModal}
                disabled={editLoading}
              >
                Cancel
              </GlassButton>
              <GlassButton
                className="flex-1"
                variant="primary"
                onClick={handleSaveLease}
                isLoading={editLoading}
              >
                Save Changes
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default AdminLeaseManagement;
