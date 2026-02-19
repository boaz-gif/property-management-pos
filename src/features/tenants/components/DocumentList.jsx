import React, { useEffect, useState, memo, useCallback } from 'react';
import api from '../../../services/apiClient';
import { FileText, Download, Trash2, Calendar, File, RefreshCw } from 'lucide-react';

const DocumentList = memo(({ 
  entityType, 
  entityId, 
  refreshTrigger, // Pass a counter here to auto-refresh list
  userRole = 'tenant' // 'admin' or 'tenant' controls actions
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (entityType) params.entityType = entityType;
      if (entityId) params.entityId = entityId;

      const response = await api.get('/documents', { params });
      setDocuments(response.data.data || []);
      setError('');
    } catch (err) {
      console.error('Fetch documents error:', err);
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [entityType, entityId, refreshTrigger]);

  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name); // Using original filename
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to move this document to trash?')) return;

    try {
      // Using DELETE method which maps to 'archive' or 'soft delete' in controller usually, 
      // or we can call archive endpoint explicitly if preferred.
      // Based on controller, DELETE /:id calls deleteDocument which does soft delete logic.
      await api.delete(`/documents/${id}`);
      
      // Remove from UI immediately
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex justify-center p-8 text-white/50 animate-pulse">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading documents...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 p-4 bg-red-500/10 rounded-lg">{error}</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed border-white/10 rounded-xl bg-white/5">
        <File className="h-10 w-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">No documents found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <table className="min-w-full divide-y divide-white/10">
        <thead className="bg-white/5">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Size</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-white/5 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-blue-400 mr-3 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-white max-w-[150px] sm:max-w-xs truncate" title={doc.name}>
                      {doc.name}
                    </div>
                    {doc.description && (
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{doc.description}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 capitalize">
                  {doc.category || 'General'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 hidden md:table-cell">
                {formatSize(doc.file_size || doc.size)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 hidden lg:table-cell">
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(doc.created_at)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => handleDownload(doc)}
                    className="p-1 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-blue-400 transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  
                  {userRole === 'admin' && (
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

DocumentList.displayName = 'DocumentList';

export default DocumentList;
