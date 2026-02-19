import React, { useState, useEffect } from 'react';
import {
  Users,
  Mail,
  Calendar,
  Shield,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  AlertCircle,
  Archive,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import api from '../../../services/api';
import { authAPI } from '../../../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [showArchived]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getProfile();
      setCurrentUser(response.data.data?.user || response.data.user);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = showArchived ? '?onlyArchived=true' : '';
      const response = await api.get(`/auth/users${params}`);
      setUsers(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.email.toLowerCase().includes(term) ||
          (user.name && user.name.toLowerCase().includes(term))
      );
    }

    setFilteredUsers(filtered);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'tenant':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleArchiveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to archive this user? You can restore it later.')) {
      return;
    }

    try {
      await authAPI.archiveUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to archive user');
    }
  };

  const handleRestoreUser = async (userId) => {
    if (!window.confirm('Are you sure you want to restore this user?')) {
      return;
    }

    try {
      await authAPI.restoreUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to restore user');
    }
  };

  const handlePermanentDelete = async (userId) => {
    const confirmText = prompt(
      '⚠️ DANGER: This will permanently delete this user and cannot be undone.\n\nType "DELETE" to confirm:'
    );

    if (confirmText !== 'DELETE') {
      return;
    }

    try {
      await authAPI.permanentDeleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to permanently delete user');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await api.patch(`/auth/users/${userId}`, {
        status: currentStatus === 'active' ? 'inactive' : 'active',
      });
      setUsers(
        users.map(u =>
          u.id === userId
            ? { ...u, status: currentStatus === 'active' ? 'inactive' : 'active' }
            : u
        )
      );
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Users className="w-12 h-12 text-blue-500" />
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
            User Management {showArchived && '(Archived)'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage all system users and their access levels
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
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Plus className="w-5 h-5" />
              Add User
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

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="tenant">Tenant</option>
        </select>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Super Admins</p>
              <p className="text-2xl font-bold text-red-600">
                {users.filter(u => u.role === 'super_admin').length}
              </p>
            </div>
            <Shield className="w-10 h-10 text-red-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Admins</p>
              <p className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <Shield className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Tenants</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter(u => u.role === 'tenant').length}
              </p>
            </div>
            <Users className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                  Status
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
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name || 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role === 'super_admin'
                          ? 'Super Admin'
                          : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleStatusToggle(user.id, user.status || 'active')}
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          (user.status || 'active') === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {(user.status || 'active').charAt(0).toUpperCase() +
                          (user.status || 'active').slice(1)}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {formatDate(user.created_at || new Date())}
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
                              onClick={() => handleArchiveUser(user.id)}
                              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestoreUser(user.id)}
                              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                              title="Restore"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            {currentUser?.role === 'super_admin' && (
                              <button
                                onClick={() => handlePermanentDelete(user.id)}
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
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm || roleFilter !== 'all'
                        ? 'No users found matching your filters'
                        : 'No users found'}
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
          Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
        </p>
      </div>
    </div>
  );
};

export default UserManagement;
