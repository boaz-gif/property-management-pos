import React, { useState, useEffect } from 'react';
import {
  Users,
  Mail,
  Building2,
  Calendar,
  Shield,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Archive,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import api from '../../../services/api';
import { authAPI } from '../../../services/api';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    property_id: '',
  });
  const [properties, setProperties] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchAdmins();
    fetchProperties();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [showArchived]);

  useEffect(() => {
    filterAdmins();
  }, [admins, searchTerm]);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getProfile();
      setCurrentUser(response.data.data?.user || response.data.user);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const params = showArchived ? '?role=admin&onlyArchived=true' : '?role=admin';
      const response = await api.get(`/auth/users${params}`);
      setAdmins(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await api.get('/properties');
      setProperties(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    }
  };

  const filterAdmins = () => {
    let filtered = admins;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        admin =>
          admin.email.toLowerCase().includes(term) ||
          (admin.name && admin.name.toLowerCase().includes(term))
      );
    }

    setFilteredAdmins(filtered);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleArchiveAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to archive this admin? You can restore it later.')) {
      return;
    }

    try {
      await authAPI.archiveUser(adminId);
      setAdmins(admins.filter(a => a.id !== adminId));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to archive admin');
    }
  };

  const handleRestoreAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to restore this admin?')) {
      return;
    }

    try {
      await authAPI.restoreUser(adminId);
      setAdmins(admins.filter(a => a.id !== adminId));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to restore admin');
    }
  };

  const handlePermanentDelete = async (adminId) => {
    const confirmText = prompt(
      '⚠️ DANGER: This will permanently delete this admin and cannot be undone.\n\nType "DELETE" to confirm:'
    );

    if (confirmText !== 'DELETE') {
      return;
    }

    try {
      await authAPI.permanentDeleteUser(adminId);
      setAdmins(admins.filter(a => a.id !== adminId));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to permanently delete admin');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'admin',
        property_id: formData.property_id || null,
      };

      const response = await api.post('/auth/register', payload);
      setAdmins([...admins, response.data.data]);
      setFormData({ name: '', email: '', password: '', property_id: '' });
      setShowCreateForm(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create admin');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Shield className="w-12 h-12 text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Management {showArchived && '(Archived)'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Create and manage system administrators
          </p>
        </div>
        <div className="flex gap-3">
          {currentUser?.role === 'super_admin' && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                showArchived
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <Archive className="w-5 h-5" />
              {showArchived ? 'View Active' : 'View Archived'}
            </button>
          )}
          {!showArchived && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              New Admin
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-200">Error</h3>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Create Admin Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Admin
          </h2>
          <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Admin name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign to Property (optional)
              </label>
              <select
                value={formData.property_id}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- No property assignment --</option>
                {properties.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Create Admin
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Admins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {admins.length}
              </p>
            </div>
            <Shield className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">With Property</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {admins.filter(a => a.property_id).length}
              </p>
            </div>
            <Building2 className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Admin List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAdmins.length > 0 ? (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {admin.name || 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {admin.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {admin.property_name || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {formatDate(admin.created_at || new Date())}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!showArchived ? (
                          <>
                            <button className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleArchiveAdmin(admin.id)}
                              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestoreAdmin(admin.id)}
                              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                              title="Restore"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            {currentUser?.role === 'super_admin' && (
                              <button
                                onClick={() => handlePermanentDelete(admin.id)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                title="Permanent Delete"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No admins found matching your search' : 'No admins found'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          Showing <strong>{filteredAdmins.length}</strong> of <strong>{admins.length}</strong> admins
        </p>
      </div>
    </div>
  );
};

export default AdminManagement;
