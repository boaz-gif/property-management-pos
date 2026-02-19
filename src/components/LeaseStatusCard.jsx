import React from 'react';
import { Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import './LeaseStatusCard.css';

/**
 * LeaseStatusCard Component
 * Displays lease information in a card format with status indication
 */
const LeaseStatusCard = ({ lease, compact = false, onClick = null }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          icon: CheckCircle,
          className: 'status-active',
          bgColor: '#d4edda'
        };
      case 'expiring_soon':
        return {
          label: 'Expiring Soon',
          icon: AlertCircle,
          className: 'status-expiring',
          bgColor: '#fff3cd'
        };
      case 'expired':
        return {
          label: 'Expired',
          icon: XCircle,
          className: 'status-expired',
          bgColor: '#f8d7da'
        };
      default:
        return {
          label: 'Unknown',
          icon: Calendar,
          className: 'status-unknown',
          bgColor: '#e2e3e5'
        };
    }
  };

  const getDaysRemaining = () => {
    if (!lease.lease_end_date) return null;
    const end = new Date(lease.lease_end_date);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const statusConfig = getStatusConfig(lease.lease_status);
  const StatusIcon = statusConfig.icon;
  const daysRemaining = getDaysRemaining();

  if (compact) {
    return (
      <div 
        className="lease-status-card compact"
        style={{ borderLeftColor: statusConfig.bgColor }}
        onClick={onClick}
      >
        <div className="lease-card-header">
          <div className="lease-card-status">
            <StatusIcon size={18} />
            <span className="status-label">{statusConfig.label}</span>
          </div>
          {daysRemaining !== null && (
            <div className={`days-remaining ${daysRemaining < 0 ? 'expired' : daysRemaining < 7 ? 'critical' : ''}`}>
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="lease-status-card"
      style={{ borderLeftColor: statusConfig.bgColor }}
      onClick={onClick}
    >
      <div className="lease-card-header">
        <div className="lease-card-title">
          <h3>{lease.name || 'Tenant'}</h3>
          <p className="property-info">{lease.property_name} • {lease.unit || 'Unit N/A'}</p>
        </div>
        <div className={`lease-card-status ${statusConfig.className}`}>
          <StatusIcon size={20} />
          <span className="status-label">{statusConfig.label}</span>
        </div>
      </div>

      <div className="lease-card-body">
        <div className="lease-date-row">
          <div className="lease-date-item">
            <span className="lease-label">Start Date</span>
            <span className="lease-value">
              {lease.lease_start_date ? new Date(lease.lease_start_date).toLocaleDateString() : 'Not set'}
            </span>
          </div>
          <div className="lease-date-item">
            <span className="lease-label">End Date</span>
            <span className="lease-value">
              {lease.lease_end_date ? new Date(lease.lease_end_date).toLocaleDateString() : 'Not set'}
            </span>
          </div>
        </div>

        {daysRemaining !== null && (
          <div className={`lease-days ${daysRemaining < 0 ? 'expired' : daysRemaining < 7 ? 'critical' : daysRemaining < 30 ? 'warning' : 'normal'}`}>
            <Calendar size={16} />
            {daysRemaining < 0 ? (
              <span>{Math.abs(daysRemaining)} days overdue</span>
            ) : (
              <span>{daysRemaining} days remaining</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaseStatusCard;
