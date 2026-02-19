import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Settings, 
  Search, 
  Filter,
  Download,
  Eye,
  Edit,
  Pause,
  Play,
  RefreshCw,
  BarChart3,
  Activity,
  Calendar,
  DollarSign,
  Home,
  UserCheck,
  AlertCircle
} from 'lucide-react';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0
  });

  // Fetch admins data
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 50,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status })
      });

      const response = await fetch(`/api/super-admin/admins/overview?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      const data = await response.json();
      setAdmins(data.data.admins);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, filters]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Handle admin selection
  const handleAdminSelect = (admin) => {
    setSelectedAdmin(admin);
    setShowDetails(true);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  // Handle admin actions
  const handleSuspendAdmin = async (adminId) => {
    try {
      const reason = prompt('Enter reason for suspension:');
      if (!reason) return;

      const response = await fetch(`/api/super-admin/admins/${adminId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to suspend admin');
      }

      fetchAdmins();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReactivateAdmin = async (adminId) => {
    try {
      const reason = prompt('Enter reason for reactivation:');
      if (!reason) return;

      const response = await fetch(`/api/super-admin/admins/${adminId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate admin');
      }

      fetchAdmins();
    } catch (err) {
      setError(err.message);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  // Get capacity status color
  const getCapacityColor = (percentage) => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.inactive}`}>
        {status || 'inactive'}
      </span>
    );
  };

  if (loading && admins.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600">Manage and monitor admin performance</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => fetchAdmins()}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="properties">Sort by Properties</option>
            <option value="occupancy">Sort by Occupancy</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="capacity">Sort by Capacity</option>
          </select>

          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alerts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                      <div className="text-sm text-gray-500">{admin.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(admin.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Home className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm text-gray-900">{admin.properties_managed}</div>
                        <div className="text-xs text-gray-500">{admin.total_units} units</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BarChart3 className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatPercentage(admin.occupancy_rate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {admin.occupied_units}/{admin.total_units}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(admin.revenue_collected)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatPercentage(admin.collection_rate)} collected
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getCapacityColor(admin.property_capacity_pct)}`}>
                      {formatPercentage(admin.property_capacity_pct)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {admin.current_properties}/{admin.max_properties}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {admin.active_alerts > 0 ? (
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="text-sm font-medium text-yellow-600">
                          {admin.active_alerts}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAdminSelect(admin)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAdminSelect(admin)}
                        className="text-gray-600 hover:text-gray-900"
                        title="View Performance"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      {admin.status === 'active' ? (
                        <button
                          onClick={() => handleSuspendAdmin(admin.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Suspend Admin"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateAdmin(admin.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Reactivate Admin"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.currentPage - 1) * 50 + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * 50, pagination.totalRecords)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.totalRecords}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Details Modal */}
      {showDetails && selectedAdmin && (
        <AdminDetailsModal
          admin={selectedAdmin}
          onClose={() => {
            setShowDetails(false);
            setSelectedAdmin(null);
          }}
          onUpdate={fetchAdmins}
        />
      )}
    </div>
  );
};

// Admin Details Modal Component
const AdminDetailsModal = ({ admin, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (admin && activeTab === 'performance') {
      fetchPerformance();
    }
  }, [admin, activeTab]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/super-admin/admins/${admin.id}/performance?period=monthly`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const data = await response.json();
      setPerformance(data.data);
    } catch (error) {
      console.error('Error fetching performance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Admin Details: {admin.name}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {['overview', 'performance', 'activity', 'capacity'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'overview' && (
                <AdminOverview admin={admin} />
              )}
              {activeTab === 'performance' && (
                <AdminPerformance performance={performance} loading={loading} />
              )}
              {activeTab === 'activity' && (
                <AdminActivity adminId={admin.id} />
              )}
              {activeTab === 'capacity' && (
                <AdminCapacity adminId={admin.id} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Overview Component
const AdminOverview = ({ admin }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center">
          <Home className="w-8 h-8 text-blue-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600">Properties</p>
            <p className="text-2xl font-bold text-gray-900">{admin.properties_managed}</p>
            <p className="text-xs text-gray-500">{admin.total_units} total units</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center">
          <BarChart3 className="w-8 h-8 text-green-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
            <p className="text-2xl font-bold text-gray-900">{admin.occupancy_rate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">{admin.occupied_units} occupied</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center">
          <DollarSign className="w-8 h-8 text-yellow-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600">Revenue Collected</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(admin.revenue_collected)}
            </p>
            <p className="text-xs text-gray-500">{admin.collection_rate.toFixed(1)}% collection rate</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center">
          <Users className="w-8 h-8 text-purple-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600">Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{admin.current_tenants}</p>
            <p className="text-xs text-gray-500">{admin.new_tenants} new this month</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center">
          <Activity className="w-8 h-8 text-red-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600">Maintenance</p>
            <p className="text-2xl font-bold text-gray-900">{admin.maintenance_resolved}</p>
            <p className="text-xs text-gray-500">{admin.maintenance_pending} pending</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-8 h-8 text-orange-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600">Active Alerts</p>
            <p className="text-2xl font-bold text-gray-900">{admin.active_alerts}</p>
            <p className="text-xs text-gray-500">Requires attention</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Performance Component
const AdminPerformance = ({ performance, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No performance data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Performance Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Total Revenue:</span>
            <span className="ml-2 font-medium">{formatCurrency(performance.summary?.totalRevenue || 0)}</span>
          </div>
          <div>
            <span className="text-blue-700">Avg Occupancy:</span>
            <span className="ml-2 font-medium">{performance.summary?.avgOccupancy?.toFixed(1) || 0}%</span>
          </div>
          <div>
            <span className="text-blue-700">New Tenants:</span>
            <span className="ml-2 font-medium">{performance.summary?.totalNewTenants || 0}</span>
          </div>
          <div>
            <span className="text-blue-700">Revenue Growth:</span>
            <span className="ml-2 font-medium">{performance.summary?.revenueGrowth?.toFixed(1) || 0}%</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-4">Monthly Metrics</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Occupancy</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Tenants</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performance.metrics?.slice(0, 6).map((metric, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {new Date(metric.metric_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {formatCurrency(metric.revenue_collected)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {metric.occupancy_rate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {metric.new_tenants}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {metric.collection_rate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Admin Activity Component
const AdminActivity = ({ adminId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [adminId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/super-admin/admins/${adminId}/activity?limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Recent Activity</h4>
      {activities.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No recent activity</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
                {activity.details && (
                  <p className="text-xs text-gray-600 mt-1">
                    {JSON.stringify(activity.details)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Admin Capacity Component
const AdminCapacity = ({ adminId }) => {
  const [capacity, setCapacity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCapacity();
  }, [adminId]);

  const fetchCapacity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/super-admin/admins/${adminId}/capacity-status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch capacity status');
      }

      const data = await response.json();
      setCapacity(data.data);
    } catch (error) {
      console.error('Error fetching capacity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!capacity) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No capacity data available</p>
      </div>
    );
  }

  const getCapacityColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <h4 className="font-medium text-gray-900 mb-2">Properties</h4>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                  {capacity.current_properties}/{capacity.max_properties}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-green-600">
                  {capacity.property_capacity_pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200">
              <div
                style={{ width: `${Math.min(capacity.property_capacity_pct, 100)}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getCapacityColor(capacity.property_capacity_pct)}`}
              ></div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h4 className="font-medium text-gray-900 mb-2">Units</h4>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  {capacity.current_units}/{capacity.max_units}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {capacity.unit_capacity_pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
              <div
                style={{ width: `${Math.min(capacity.unit_capacity_pct, 100)}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getCapacityColor(capacity.unit_capacity_pct)}`}
              ></div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h4 className="font-medium text-gray-900 mb-2">Tenants</h4>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                  {capacity.current_tenants}/{capacity.max_tenants}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-purple-600">
                  {capacity.tenant_capacity_pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
              <div
                style={{ width: `${Math.min(capacity.tenant_capacity_pct, 100)}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getCapacityColor(capacity.tenant_capacity_pct)}`}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {capacity.exceededLimits && capacity.exceededLimits.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2">Capacity Limits Exceeded</h4>
          <ul className="text-sm text-red-800 space-y-1">
            {capacity.exceededLimits.map((limit, index) => (
              <li key={index}>
                {limit.type}: {limit.current}/{limit.max} ({limit.percentage.toFixed(1)}%)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
