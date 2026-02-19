import React, { useEffect, useState, memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import api from '../../../services/apiClient';
import { FileText, Download, Trash2, Calendar, File, RefreshCw } from 'lucide-react';
import GlassCard from '../../../components/ui/GlassCard';

const DocumentList = memo(({ 
  entityType, 
  entityId, 
  refreshTrigger, // Pass a counter here to auto-refresh list
  userRole = 'tenant' // 'admin' or 'tenant' controls actions
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const parentRef = useRef(null);

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

  const rowVirtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
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
      await api.delete(`/documents/${id}`);
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
      {/* Header - Mimicking table header */}
      <div className="bg-white/5 flex px-6 py-3 border-b border-white/10 text-xs font-medium text-gray-400 uppercase tracking-wider">
        <div className="flex-1 min-w-0">Name</div>
        <div className="w-32 hidden sm:block px-4">Category</div>
        <div className="w-24 hidden md:block px-4">Size</div>
        <div className="w-40 hidden lg:block px-4">Date</div>
        <div className="w-32 text-right">Actions</div>
      </div>

      <div 
        ref={parentRef}
        className="overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
        style={{ height: '400px' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const doc = documents[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className="absolute top-0 left-0 w-full flex items-center px-6 border-b border-white/5 hover:bg-white/5 transition-colors"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex-1 min-w-0 flex items-center">
                  <FileText className="h-5 w-5 text-blue-400 mr-3 shrink-0" />
                  <div className="truncate">
                    <div className="text-sm font-medium text-white truncate" title={doc.name}>
                      {doc.name}
                    </div>
                    {doc.description && (
                      <div className="text-[10px] text-gray-500 truncate">{doc.description}</div>
                    )}
                  </div>
                </div>

                <div className="w-32 hidden sm:block px-4">
                  <span className="px-2 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 capitalize">
                    {doc.category || 'General'}
                  </span>
                </div>

                <div className="w-24 hidden md:block px-4 text-sm text-gray-400">
                  {formatSize(doc.file_size || doc.size)}
                </div>

                <div className="w-40 hidden lg:block px-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(doc.created_at)}
                  </div>
                </div>

                <div className="w-32 flex justify-end gap-2">
                  <button 
                    onClick={() => handleDownload(doc)}
                    className="p-1 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-blue-400 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  
                  {userRole === 'admin' && (
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

DocumentList.displayName = 'DocumentList';

export default DocumentList;
