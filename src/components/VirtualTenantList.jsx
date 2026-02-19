import React, { memo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteTenants } from '../hooks/useQueries';
import { MoreHorizontal, Mail, Phone, Home, Calendar } from 'lucide-react';

// Row component for virtual list
const TenantRow = memo(({ tenant, onTenantClick }) => {
  return (
    <div 
      className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors w-full h-full"
      onClick={() => onTenantClick(tenant)}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {tenant.name?.charAt(0)?.toUpperCase() || 'T'}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">
                  {tenant.name}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {tenant.email}
                  </span>
                  {tenant.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {tenant.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              tenant.status === 'active' 
                ? 'bg-green-500/20 text-green-400' 
                : tenant.status === 'inactive'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {tenant.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

TenantRow.displayName = 'TenantRow';

// Virtualized tenant list component
const VirtualTenantList = memo(({ 
  onTenantClick, 
  userRole = 'admin',
  searchParams = {},
  height = 600,
  rowHeight = 100 
}) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteTenants(searchParams);

  const parentRef = useRef(null);

  // Flatten all pages into a single array
  const tenants = data?.pages?.flatMap(page => page.data) || [];
  
  // Count of items (including loading indicator if needed)
  const count = tenants.length;

  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Load more items when reaching the bottom
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];

    if (!lastItem) return;

    if (
      lastItem.index >= tenants.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, tenants.length, virtualItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-400">
        <p className="text-sm font-semibold">Failed to load tenants</p>
        <p className="text-xs mt-1 opacity-70">{error.message}</p>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <Home className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm">No tenants found</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-white">
          Tenants ({tenants.length}+)
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Virtualized by @tanstack/react-virtual
        </p>
      </div>
      
      <div 
        ref={parentRef}
        className="overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
        style={{ height: `${height}px` }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TenantRow 
                tenant={tenants[virtualRow.index]} 
                onTenantClick={onTenantClick} 
              />
            </div>
          ))}
        </div>
      </div>

      {isFetchingNextPage && (
        <div className="flex items-center justify-center p-3 border-t border-gray-700 bg-gray-800/30">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-xs text-gray-400 font-medium">Loading more tenants...</span>
        </div>
      )}
    </div>
  );
});

VirtualTenantList.displayName = 'VirtualTenantList';

export default VirtualTenantList;
