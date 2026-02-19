import React, { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useInfiniteTenants } from '../hooks/useQueries';
import { MoreHorizontal, Mail, Phone, Home, Calendar } from 'lucide-react';

// Row component for virtual list
const TenantRow = memo(({ index, style, data }) => {
  const { tenants, onTenantClick, userRole } = data;
  const tenant = tenants[index];

  if (!tenant) {
    return (
      <div style={style} className="flex items-center justify-center p-4 border-b border-gray-700">
        <MoreHorizontal className="h-4 w-4 text-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div 
      style={style} 
      className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors"
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
                  {tenant.property_name && (
                    <span className="flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      {tenant.property_name}
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
            {tenant.rent && (
              <span className="text-sm text-gray-300">
                ${tenant.rent}/mo
              </span>
            )}
          </div>
        </div>
        {tenant.lease_start_date && (
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            Lease: {new Date(tenant.lease_start_date).toLocaleDateString()} - 
            {tenant.lease_end_date ? new Date(tenant.lease_end_date).toLocaleDateString() : 'Ongoing'}
          </div>
        )}
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
  rowHeight = 120 
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

  // Flatten all pages into a single array
  const tenants = data?.pages?.flatMap(page => page.data) || [];
  
  // Determine if there are more items to load
  const isItemLoaded = useCallback(index => {
    return !hasNextPage || index < tenants.length;
  }, [hasNextPage, tenants.length]);

  // Load more items
  const loadMoreItems = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Count of items (including loading indicator)
  const itemCount = hasNextPage ? tenants.length + 1 : tenants.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <p className="text-sm">Failed to load tenants</p>
        <p className="text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Home className="h-12 w-12 mb-2" />
        <p className="text-sm">No tenants found</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">
          Tenants ({tenants.length}+)
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Virtualized list for optimal performance
        </p>
      </div>
      
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadMoreItems}
        threshold={10}
      >
        {({ onItemsRendered, ref }) => (
          <List
            ref={ref}
            height={height}
            itemCount={itemCount}
            itemSize={rowHeight}
            itemData={{ tenants, onTenantClick, userRole }}
            onItemsRendered={onItemsRendered}
            className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
          >
            {TenantRow}
          </List>
        )}
      </InfiniteLoader>

      {isFetchingNextPage && (
        <div className="flex items-center justify-center p-4 border-t border-gray-700">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-sm text-gray-400">Loading more tenants...</span>
        </div>
      )}
    </div>
  );
});

VirtualTenantList.displayName = 'VirtualTenantList';

export default VirtualTenantList;
