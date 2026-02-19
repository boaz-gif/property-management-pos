import React, { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useInfiniteProperties } from '../hooks/useQueries';
import { MoreHorizontal, Home, MapPin, DollarSign, Users, Calendar } from 'lucide-react';

// Row component for virtual list
const PropertyRow = memo(({ index, style, data }) => {
  const { properties, onPropertyClick, userRole } = data;
  const property = properties[index];

  if (!property) {
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
      onClick={() => onPropertyClick(property)}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">
                  {property.name || property.address}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {property.address}
                  </span>
                  {property.type && (
                    <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">
                      {property.type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {property.rent_amount && (
              <span className="text-sm text-gray-300">
                ${property.rent_amount}/mo
              </span>
            )}
            <span className={`px-2 py-1 text-xs rounded-full ${
              property.status === 'occupied' 
                ? 'bg-green-500/20 text-green-400' 
                : property.status === 'vacant'
                ? 'bg-yellow-500/20 text-yellow-400'
                : property.status === 'maintenance'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {property.status || 'unknown'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {property.unit_count && (
            <span className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              {property.unit_count} units
            </span>
          )}
          {property.occupied_units !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {property.occupied_units}/{property.unit_count} occupied
            </span>
          )}
          {property.created_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Added {new Date(property.created_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Occupancy indicator */}
        {property.unit_count && property.occupied_units !== undefined && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Occupancy</span>
              <span>{Math.round((property.occupied_units / property.unit_count) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (property.occupied_units / property.unit_count) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

PropertyRow.displayName = 'PropertyRow';

// Virtualized property list component
const VirtualPropertyList = memo(({ 
  onPropertyClick, 
  userRole = 'admin',
  searchParams = {},
  height = 600,
  rowHeight = 140 
}) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteProperties(searchParams);

  // Flatten all pages into a single array
  const properties = data?.pages?.flatMap(page => page.data) || [];
  
  // Determine if there are more items to load
  const isItemLoaded = useCallback(index => {
    return !hasNextPage || index < properties.length;
  }, [hasNextPage, properties.length]);

  // Load more items
  const loadMoreItems = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Count of items (including loading indicator)
  const itemCount = hasNextPage ? properties.length + 1 : properties.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <p className="text-sm">Failed to load properties</p>
        <p className="text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Home className="h-12 w-12 mb-2" />
        <p className="text-sm">No properties found</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">
          Properties ({properties.length}+)
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
            itemData={{ properties, onPropertyClick, userRole }}
            onItemsRendered={onItemsRendered}
            className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
          >
            {PropertyRow}
          </List>
        )}
      </InfiniteLoader>

      {isFetchingNextPage && (
        <div className="flex items-center justify-center p-4 border-t border-gray-700">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mr-2"></div>
          <span className="text-sm text-gray-400">Loading more properties...</span>
        </div>
      )}
    </div>
  );
});

VirtualPropertyList.displayName = 'VirtualPropertyList';

export default VirtualPropertyList;
