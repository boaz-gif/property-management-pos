import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Home, MapPin, ArrowRight } from 'lucide-react';
import GlassCard from '../../ui/GlassCard';

const VirtualPropertyList = ({ properties = [], onItemClick }) => {
    const parentRef = React.useRef();

    const rowVirtualizer = useVirtualizer({
        count: properties.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100, // height of each item
        overscan: 5,
    });

    return (
        <div 
            ref={parentRef} 
            className="h-[600px] overflow-auto scrollbar-hide pr-2"
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const property = properties[virtualItem.index];
                    return (
                        <div
                            key={virtualItem.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualItem.size}px`,
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                            className="p-1"
                        >
                            <GlassCard 
                                onClick={() => onItemClick(property)}
                                className="flex items-center gap-4 p-4 cursor-pointer hover:border-blue-500/20 transition-all h-full"
                            >
                                <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <Home className="h-6 w-6 text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-white truncate">{property.name}</h4>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">{property.address}</span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 px-2">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Units</p>
                                    <p className="text-sm font-bold text-white">{property.total_units}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-600" />
                            </GlassCard>
                        </div>
                    );
                })}
            </div>
            
            {properties.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <p>No properties to display</p>
                </div>
            )}
        </div>
    );
};

export default VirtualPropertyList;
