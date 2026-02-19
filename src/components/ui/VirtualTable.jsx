import React, { useRef, useState, useEffect } from 'react';
import { List } from 'react-window';
import GlassCard from './GlassCard';

/**
 * A reusable, virtualized table component for high-performance list rendering.
 * 
 * @param {Array} items - The data items to render.
 * @param {Array} columns - Column definitions { header: string, key: string, render: function, width: string }.
 * @param {number} itemSize - The fixed height of each row (default: 60).
 * @param {number} height - The height of the scrollable area (default: 500).
 * @param {string} className - Additional CSS classes for the container.
 * @param {React.ReactNode} emptyState - Component to show when items array is empty.
 */
const VirtualTable = ({ 
    items = [], 
    columns = [], 
    itemSize = 60, 
    height = 500, 
    className = "",
    emptyState = <div className="p-8 text-center text-gray-500">No data available</div>
}) => {
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (containerRef.current) {
            const updateWidth = () => {
                setContainerWidth(containerRef.current.offsetWidth);
            };
            updateWidth();
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }
    }, []);

    const Row = ({ index, style }) => {
        const item = items[index];
        return (
            <div 
                style={style} 
                className="flex items-center border-b border-white/5 hover:bg-white/5 transition-colors px-4"
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
    };

    if (items.length === 0) {
        return <GlassCard p={false} className={className}>{emptyState}</GlassCard>;
    }

    return (
        <GlassCard p={false} className={`overflow-hidden ${className}`}>
            <div ref={containerRef} className="w-full">
                {/* Header */}
                <div className="flex items-center bg-white/5 border-b border-white/10 px-4 py-3 sticky top-0 z-10">
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

                {/* List */}
                <List
                    height={height}
                    itemCount={items.length}
                    itemSize={itemSize}
                    width={containerWidth || '100%'}
                >
                    {Row}
                </List>
            </div>
        </GlassCard>
    );
};

export default VirtualTable;
