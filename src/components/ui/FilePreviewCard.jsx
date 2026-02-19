import React from 'react';
import { FileText, Image as ImageIcon, Download, Trash2, Eye } from 'lucide-react';
import GlassCard from './GlassCard';
import GlassButton from './GlassButton';

const FilePreviewCard = ({ file, onDelete, onDownload, onPreview }) => {
  // Simple extension check or mime type
  const isImage = file.type?.startsWith('image/') || 
                  (file.name && ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => file.name.toLowerCase().endsWith(ext)));
  
  return (
    <GlassCard className="p-4 flex flex-col gap-3 group">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black/20 flex items-center justify-center">
        {isImage ? (
           <img 
             src={file.url || file.preview} 
             alt={file.name} 
             className="w-full h-full object-cover"
           />
        ) : (
           <FileText className="w-12 h-12 text-blue-400" />
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
           {onPreview && (
             <button onClick={() => onPreview(file)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors" title="Preview">
               <Eye className="w-5 h-5" />
             </button>
           )}
           {onDownload && (
             <button onClick={() => onDownload(file)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors" title="Download">
               <Download className="w-5 h-5" />
             </button>
           )}
        </div>
      </div>
      
      <div className="flex items-start justify-between gap-2">
        <div className="overflow-hidden">
          <h3 className="text-sm font-medium text-white truncate" title={file.name}>{file.name}</h3>
          <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        
        {onDelete && (
          <button 
            onClick={() => onDelete(file)} 
            className="text-red-400 hover:text-red-300 transition-colors p-1"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </GlassCard>
  );
};

export default FilePreviewCard;
