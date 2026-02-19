import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Download, ChevronDown, ChevronUp,
  Clock, User, Package, AlertCircle, CheckCircle,
  Calendar, ArrowUpDown
} from 'lucide-react';
import api from '../../../services/api';

/**
 * Super Admin Audit Logs Viewer
 * 
 * Features:
 * - View all audit logs
 * - Filter by user, action, resource type, date range
 * - View before/after values for changes
 * - Pagination and search
 * - Export to CSV
 */
function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resourceType: '',
    startDate: '',
    endDate: ''
  });

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Modal for viewing details
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Available filter options
  const actions = ['create', 'update', 'delete', 'read'];
  const resourceTypes = ['tenant', 'property', 'maintenance', 'payment', 'notification', 'document', 'user'];

  /**
   * Fetch audit logs
   */
  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page,
        limit,
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await api.get(`/audit/logs?${queryParams}`);

      const data = response.data;

      if (data.success) {
        setLogs(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 0);
      } else {
        setError(data.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load logs on component mount and when filters/pagination change
   */
  useEffect(() => {
    fetchAuditLogs();
  }, [page, limit, filters]);

  /**
   * Handle filter change
   */
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(1); // Reset to first page when filtering
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      resourceType: '',
      startDate: '',
      endDate: ''
    });
    setPage(1);
  };

  /**
   * Toggle row expansion
   */
  const toggleRowExpansion = (logId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  /**
   * Show log details modal
   */
  const showLogDetails = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  /**
   * Export logs to CSV
   */
  const exportToCSV = () => {
    if (logs.length === 0) {
      alert('No logs to export');
      return;
    }

    const headers = [
      'ID', 'User ID', 'Action', 'Resource Type', 'Resource ID',
      'Status', 'IP Address', 'Created At'
    ];

    const rows = logs.map(log => [
      log.id,
      log.userId,
      log.action,
      log.resourceType,
      log.resourceId || '-',
      log.status,
      log.ipAddress || '-',
      new Date(log.createdAt).toLocaleString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get action badge color
   */
  const getActionColor = (action) => {
    switch (action) {
      case 'create':
        return 'bg-blue-100 text-blue-800';
      case 'update':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'read':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">Track all system operations and changes</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter size={20} />
            Filters
          </h2>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* User ID Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="number"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              placeholder="Enter user ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Actions</option>
              {actions.map(action => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource Type
            </label>
            <select
              value={filters.resourceType}
              onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-800 font-medium">Error loading audit logs</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Logs Table */}
      {!loading && logs.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.resourceType}
                          </p>
                          {log.resourceId && (
                            <p className="text-xs text-gray-500">
                              ID: {log.resourceId}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.userEmail || `User #${log.userId}`}
                          </p>
                          {log.userRole && (
                            <p className="text-xs text-gray-500 capitalize">
                              {log.userRole}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status === 'success' ? (
                          <CheckCircle size={14} className="mr-1" />
                        ) : (
                          <AlertCircle size={14} className="mr-1" />
                        )}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={16} />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleRowExpansion(log.id)}
                        className="text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1"
                      >
                        {expandedRows.has(log.id) ? (
                          <>
                            <ChevronUp size={16} />
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {expandedRows.has(log.id) && (
                    <tr className="bg-gray-50">
                      <td colSpan="6" className="px-6 py-4">
                        <div className="space-y-4">
                          {/* User Information */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-gray-200 rounded p-3">
                            <div>
                              <p className="text-xs font-medium text-gray-700 uppercase">User ID</p>
                              <p className="text-sm text-gray-900">{log.userId || 'N/A (Deleted User)'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-700 uppercase">User Email</p>
                              <p className="text-sm text-gray-900 font-mono">{log.userEmail || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-700 uppercase">User Role</p>
                              <p className="text-sm text-gray-900 capitalize font-semibold">
                                {log.userRole || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-700 uppercase">IP Address</p>
                              <p className="text-sm text-gray-900 font-mono">{log.ipAddress || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-700 uppercase">User Agent</p>
                              <p className="text-sm text-gray-900 font-mono truncate" title={log.userAgent}>
                                {log.userAgent ? log.userAgent.substring(0, 50) + '...' : 'N/A'}
                              </p>
                            </div>
                            {log.errorMessage && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 uppercase">Error</p>
                                <p className="text-sm text-red-600">{log.errorMessage}</p>
                              </div>
                            )}
                          </div>

                          {/* Old/New Values */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {log.oldValues && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 uppercase mb-2">Before</p>
                                <pre className="bg-white border border-gray-200 rounded p-3 text-xs overflow-x-auto max-h-64">
                                  {JSON.stringify(log.oldValues, null, 2)}
                                </pre>
                              </div>
                            )}

                            {log.newValues && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 uppercase mb-2">After</p>
                                <pre className="bg-white border border-gray-200 rounded p-3 text-xs overflow-x-auto max-h-64">
                                  {JSON.stringify(log.newValues, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && logs.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-lg">No audit logs found</p>
          <p className="text-gray-500 text-sm">Try adjusting your filters or check back later</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && logs.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {logs.length} of {total} results
          </div>

          <div className="flex items-center gap-4">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm transition ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogs;
