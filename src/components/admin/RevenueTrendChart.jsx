import React from 'react';
import GlassCard from '../ui/GlassCard';

const RevenueTrendChart = ({ data = [] }) => {
  const maxValue = Math.max(...data.map((item) => item.value || 0), 0);

  return (
    <GlassCard className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Revenue Trend</h3>
        <p className="text-sm text-gray-400">Collection performance over time</p>
      </div>
      <div className="flex items-end gap-2 h-32">
        {data.length === 0 && (
          <div className="text-sm text-gray-400">No revenue trend data available.</div>
        )}
        {data.map((point) => {
          const height = maxValue ? Math.max((point.value / maxValue) * 100, 8) : 8;
          return (
            <div key={point.label} className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-md bg-amber-400/60"
                style={{ height: `${height}%` }}
                title={`${point.label}: ${point.value}`}
              />
              <span className="text-[10px] text-gray-400 mt-2">{point.label}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default RevenueTrendChart;
