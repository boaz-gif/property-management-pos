import React from 'react';
import GlassCard from '../ui/GlassCard';

const RecentActivityFeed = ({ activities = [] }) => {
  return (
    <GlassCard className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <p className="text-sm text-gray-400">Latest portfolio updates</p>
      </div>
      <div className="space-y-3">
        {activities.length === 0 && (
          <div className="text-sm text-gray-400">No recent activity yet.</div>
        )}
        {activities.map((activity, index) => (
          <div key={`${activity.activity_type}-${index}`} className="border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-gray-400">
                {activity.activity_type?.replace('_', ' ') || 'Activity'}
              </span>
              <span className="text-xs text-gray-400">
                {activity.activity_date ? new Date(activity.activity_date).toLocaleDateString() : ''}
              </span>
            </div>
            <p className="text-sm text-white font-medium">{activity.description}</p>
            <p className="text-xs text-gray-400 mt-1">
              {activity.property_name && `🏢 ${activity.property_name}`}
              {activity.tenant_name && ` • 👤 ${activity.tenant_name}`}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export default RecentActivityFeed;
