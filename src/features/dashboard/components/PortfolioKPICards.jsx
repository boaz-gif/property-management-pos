import React from 'react';
import { Building, Users, TrendingUp, DollarSign, Wrench, Calendar } from 'lucide-react';
import GlassCard from '../../../components/ui/GlassCard';
import { formatKES } from '../../../utils/currency';

const formatCurrency = (value) => {
  return formatKES(value, { maximumFractionDigits: 0 });
};

const formatPercent = (value) => `${(value || 0).toFixed(1)}%`;

const PortfolioKPICards = ({ metrics = {} }) => {
  const cards = [
    {
      title: 'Properties',
      value: metrics.total_properties || 0,
      icon: Building,
      color: 'bg-emerald-500'
    },
    {
      title: 'Units',
      value: metrics.total_units || 0,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Occupancy',
      value: formatPercent(metrics.occupancy_rate),
      icon: TrendingUp,
      color: 'bg-indigo-500'
    },
    {
      title: 'Revenue',
      value: formatCurrency(metrics.monthly_revenue),
      icon: DollarSign,
      color: 'bg-amber-500'
    },
    {
      title: 'Maintenance',
      value: metrics.active_maintenance_requests || 0,
      icon: Wrench,
      color: 'bg-orange-500'
    },
    {
      title: 'Leases Expiring',
      value: metrics.leases_expiring_30_days || 0,
      icon: Calendar,
      color: 'bg-rose-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {cards.map((card) => (
        <GlassCard key={card.title} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">{card.title}</p>
              <p className="text-3xl font-semibold text-white">{card.value}</p>
            </div>
            <div className={`p-3 rounded-lg bg-white/10 ${card.color}`}>
              <card.icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};

export default PortfolioKPICards;
