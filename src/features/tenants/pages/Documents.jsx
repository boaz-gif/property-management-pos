import React, { useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import DocumentList from '../components/DocumentList';
import DocumentUpload from '../components/DocumentUpload';
import { FolderOpen, Filter, Search } from 'lucide-react';

const Documents = () => {
  const { user, isAdmin, isTenant, isSuperAdmin } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('all'); // all, property, tenant
  const [filterId, setFilterId] = useState('');

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getRole = () => {
    if (isSuperAdmin()) return 'super_admin';
    if (isAdmin()) return 'admin';
    return 'tenant';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Documents</h1>
          <p className="text-gray-400">Manage and organize your files.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload & Filters (Admin only) */}
        <div className="space-y-6">
          <DocumentUpload 
            onUploadComplete={handleUploadComplete}
            entityType={isAdmin() ? 'property' : 'tenant'} // Default context
            entityId={isAdmin() ? user?.properties?.[0] : null} // Default to first property for admin if available
          />

          {isAdmin() && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-400" />
                Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">View Context</label>
                  <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button 
                      onClick={() => setActiveTab('all')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'all' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setActiveTab('property')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'property' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Properties
                    </button>
                    <button 
                      onClick={() => setActiveTab('tenant')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'tenant' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Tenants
                    </button>
                  </div>
                </div>

                {(activeTab === 'property' || activeTab === 'tenant') && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      {activeTab === 'property' ? 'Property ID' : 'Tenant ID'}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <input 
                        type="number"
                        value={filterId}
                        onChange={(e) => setFilterId(e.target.value)}
                        placeholder={`Enter ${activeTab} ID...`}
                        className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Document List */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 min-h-[500px]">
            <div className="flex items-center gap-2 mb-6">
              <FolderOpen className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">File Browser</h2>
            </div>
            
            <DocumentList 
              userRole={getRole()}
              refreshTrigger={refreshTrigger}
              entityType={activeTab !== 'all' ? activeTab : undefined}
              entityId={filterId || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
