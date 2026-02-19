import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import GlassCard from '../../ui/GlassCard';

const PropertyImageUpload = ({ images = [], onUpload, onRemove, maxImages = 5 }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            onUpload(files);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            onUpload(files);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-400" />
                    Property Images
                </h4>
                <span className="text-xs text-gray-500">{images.length} / {maxImages}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {images.map((img, index) => (
                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10">
                        <img 
                            src={typeof img === 'string' ? img : URL.createObjectURL(img)} 
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        <button
                            onClick={() => onRemove(index)}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}

                {images.length < maxImages && (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                            relative aspect-square rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 cursor-pointer
                            ${isDragging 
                                ? 'border-blue-500 bg-blue-500/10 scale-[0.98]' 
                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}
                        `}
                    >
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="p-3 bg-white/5 rounded-full mb-2">
                            <Upload className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium text-center">
                            <span className="text-blue-400">Click to upload</span> or drag and drop
                        </p>
                    </div>
                )}
            </div>

            <div className="flex gap-4 items-center p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> JPG, PNG or WEBP
                </p>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Max 5MB per file
                </p>
            </div>
        </div>
    );
};

export default PropertyImageUpload;
