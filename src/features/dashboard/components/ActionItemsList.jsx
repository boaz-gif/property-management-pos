import React from 'react';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';

const priorityStyles = {
  critical: 'border-red-500/60 bg-red-500/10',
  high: 'border-orange-500/60 bg-orange-500/10',
  medium: 'border-yellow-500/60 bg-yellow-500/10',
  low: 'border-emerald-500/60 bg-emerald-500/10'
};

const priorityLabel = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

const ActionItemsList = ({ items = [], onViewAll }) => {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Action Items</h3>
          <p className="text-sm text-gray-400">Prioritized portfolio tasks</p>
        </div>
        {onViewAll && (
          <GlassButton variant="secondary" onClick={onViewAll}>
            View All
          </GlassButton>
        )}
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-sm text-gray-400">All caught up. No urgent action items.</div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 ${priorityStyles[item.priority] || 'border-white/10'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide text-gray-400">
                {priorityLabel[item.priority] || 'Priority'}
              </span>
              {item.due_date && (
                <span className="text-xs text-gray-400">Due {new Date(item.due_date).toLocaleDateString()}</span>
              )}
            </div>
            <h4 className="text-base font-semibold text-white mb-1">{item.title}</h4>
            <p className="text-sm text-gray-300 mb-3">{item.description}</p>
            <div className="text-xs text-gray-400">
              {item.property_name && <span className="mr-3">🏢 {item.property_name}</span>}
              {item.tenant_name && <span>👤 {item.tenant_name}</span>}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export default React.memo(ActionItemsList);
