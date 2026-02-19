import React from 'react';
import GlassCard from '../../../components/ui/GlassCard';

const PropertyComparisonTable = ({ properties = [] }) => {
  return (
    <GlassCard className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Property Comparison</h3>
        <p className="text-sm text-gray-400">Performance snapshot across your portfolio</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="pb-3">Property</th>
              <th className="pb-3">Occupancy</th>
              <th className="pb-3">Revenue</th>
              <th className="pb-3">Collection</th>
              <th className="pb-3">NOI</th>
              <th className="pb-3">Maintenance</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 && (
              <tr>
                <td className="py-3 text-gray-400" colSpan={6}>
                  No property metrics available yet.
                </td>
              </tr>
            )}
            {properties.map((property) => (
              <tr key={property.property_id} className="border-t border-white/10">
                <td className="py-3">
                  <div className="text-white font-medium">{property.property_name}</div>
                  <div className="text-xs text-gray-400">{property.property_address}</div>
                </td>
                <td className="py-3 text-white">{(property.occupancy_rate || 0).toFixed(1)}%</td>
                <td className="py-3 text-white">${Number(property.revenue || 0).toFixed(0)}</td>
                <td className="py-3 text-white">{(property.collection_rate || 0).toFixed(1)}%</td>
                <td className="py-3 text-white">${Number(property.net_operating_income || 0).toFixed(0)}</td>
                <td className="py-3 text-white">{property.maintenance_requests || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

export default PropertyComparisonTable;
