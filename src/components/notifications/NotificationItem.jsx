import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  CreditCard, 
  Wrench, 
  FileText, 
  CheckCircle, 
  Trash2, 
  Eye 
} from 'lucide-react';

const NotificationItem = ({ notification, onMarkAsRead, onDelete, onClick }) => {
  const { id, title, message, type, is_read, created_at } = notification;

  const getIcon = () => {
    switch (type) {
      case 'payment_confirmation':
        return <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><CreditCard size={16} /></div>;
      case 'maintenance_request':
      case 'maintenance_update':
        return <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><Wrench size={16} /></div>;
      case 'lease_expiring':
      case 'lease_expired':
        return <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><FileText size={16} /></div>;
      default:
        return <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><CheckCircle size={16} /></div>;
    }
  };

  return (
    <div 
      className={`relative group flex gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer border-l-2 ${
        is_read ? 'border-transparent opacity-75' : 'border-blue-500 bg-blue-500/5'
      }`}
      onClick={() => onClick(notification)}
    >
      <div className="flex-shrink-0 mt-1">
        {getIcon()}
      </div>
      
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className={`text-sm font-semibold truncate ${is_read ? 'text-gray-300' : 'text-white'}`}>
            {title}
          </h4>
          <span className="text-[10px] text-gray-500 whitespace-nowrap mt-0.5">
            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs text-gray-400 line-clamp-2 mb-2 leading-relaxed">
          {message}
        </p>
        
        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {!is_read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(id);
              }}
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
            >
              <Eye size={12} />
              Mark read
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
