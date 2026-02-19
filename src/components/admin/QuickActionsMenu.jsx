import React from 'react';
import GlassCard from '../ui/GlassCard';
import GlassButton from '../ui/GlassButton';

const QuickActionsMenu = ({ onAction }) => {
  const actions = [
    { label: 'Register Tenant', value: 'register_tenant' },
    { label: 'Record Payment', value: 'record_payment' },
    { label: 'Create Maintenance', value: 'create_maintenance' },
    { label: 'Add Property', value: 'add_property' },
    { label: 'Generate Report', value: 'generate_report' }
  ];

  return (
    <GlassCard className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        <p className="text-sm text-gray-400">Jump to common tasks</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action) => (
          <GlassButton
            key={action.value}
            variant="secondary"
            className="justify-center"
            onClick={() => onAction?.(action.value)}
          >
            {action.label}
          </GlassButton>
        ))}
      </div>
    </GlassCard>
  );
};

export default QuickActionsMenu;
