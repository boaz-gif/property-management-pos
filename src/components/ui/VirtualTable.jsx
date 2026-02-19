import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import GlassCard from './GlassCard';

/**
 * A reusable, virtualized table component for high-performance list rendering.
 * Now powered by @tanstack/react-virtual for maximum flexibility.
 * 
 * @param {Array} items - The data items to render.
 * @param {Array} columns - Column definitions { header: string, key: string, render: function, width: string }.
 * @param {number} itemSize - The estimated height of each row (default: 60).
 * @param {number} height - The height of the scrollable area (default: 500).
 * @param {string} className - Additional CSS classes for the container.
 * @param {React.ReactNode} emptyState - Component to show when items array is empty.
 * @param {Function} onRowClick - Optional click handler for rows.
 */
const VirtualTable = ({ 
    items = [], 
    columns = [], 
    itemSize = 60, 
    height = 500, 
    className = "",
    emptyState = <div className="p-8 text-center text-gray-500">No data available</div>,
    onRowClick = null
}) => {
    const parentRef = useRef(null);

    // The virtualizer logic
    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => itemSize,
        overscan: 5,
    });

    if (items.length === 0) {
        return <GlassCard p={false} className={className}>{emptyState}</GlassCard>;
    }

    const virtualItems = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();

    return (
        <GlassCard p={false} className={`overflow-hidden ${className}`}>
            <div className="w-full">
                {/* Header */}
                <div className="flex items-center bg-white/5 border-b border-white/10 px-4 py-3 sticky top-0 z-10 w-full">
                    {columns.map((col, idx) => (
                        <div 
                            key={idx} 
                            style={{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }}
                            className="text-xs font-medium text-gray-400 uppercase tracking-wider"
                        >
                            {col.header}
                        </div>
                    ))}
                </div>

                {/* Scrollable Container */}
                <div 
                    ref={parentRef}
                    className="overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                    style={{ height: `${height}px` }}
                >
                    <div
                        style={{
                            height: `${totalSize}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {virtualItems.map((virtualRow) => {
                            const item = items[virtualRow.index];
                            if (!item) return null;

                            return (
                                <div
                                    key={virtualRow.key}
                                    data-index={virtualRow.index}
                                    ref={rowVirtualizer.measureElement}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={`absolute top-0 left-0 w-full flex items-center px-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer`}
                                    style={{
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    {columns.map((col, colIdx) => (
                                        <div 
                                            key={colIdx} 
                                            style={{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }}
                                            className="truncate text-sm py-2"
                                        >
                                            {col.render ? col.render(item) : (item[col.key] || '-')}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};

export default React.memo(VirtualTable);
