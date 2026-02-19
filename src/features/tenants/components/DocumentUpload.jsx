import React, { useState, memo } from 'react';
import api from '../../../services/apiClient';
import { Upload, X, FileText, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';

const DocumentUpload = memo(({ 
  entityType = 'general', 
  entityId = null, 
  onUploadComplete,
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSize = 10 * 1024 * 1024 // 10MB
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentProgress, setCurrentProgress] = useState(0);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    setError('');
    setSuccess('');
    
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PDF, Word, or Images.');
      return;
    }

    if (file.size > maxSize) {
      setError(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit.`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setError('');
    setCurrentProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('entityType', entityType);
    if (entityId) formData.append('entityId', entityId);
    formData.append('category', category);
    formData.append('description', description);

    try {
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setCurrentProgress(progress);
        }
      });

      setSuccess('Document uploaded successfully!');
      setSelectedFile(null);
      setDescription('');
      if (onUploadComplete) onUploadComplete(response.data.data);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      console.error('Upload Error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Upload className="h-5 w-5 text-blue-400" />
        Upload Document
      </h3>

      {/* Drop Zone */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          selectedFile ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-400 bg-gray-800/50'
        }`}
      >
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          onChange={handleFileSelect}
          accept={allowedTypes.join(',')}
        />
        
        {!selectedFile ? (
          <label htmlFor="file-upload" className="cursor-pointer block">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-300 font-medium">Click to upload or drag & drop</p>
            <p className="text-gray-500 text-sm mt-1">PDF, DOCX, JPG, PNG up to 10MB</p>
          </label>
        ) : (
          <div className="relative">
            <div className="flex items-center justify-center gap-3">
              {selectedFile.type.startsWith('image/') ? (
                <ImageIcon className="h-8 w-8 text-blue-400" />
              ) : (
                <FileText className="h-8 w-8 text-blue-400" />
              )}
              <div className="text-left">
                <p className="text-white font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-gray-400 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedFile(null)}
              className="absolute -top-4 -right-4 p-1 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Metadata Form */}
      {selectedFile && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="other">Other</option>
              <option value="lease">Lease Agreement</option>
              <option value="invoice">Invoice / Receipt</option>
              <option value="legal">Legal Document</option>
              <option value="identification">Identification</option>
              <option value="photo">Photo</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Signed lease for 2024"
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              ></div>
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
              isUploading 
                ? 'bg-blue-500/50 cursor-wait' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
            }`}
          >
            {isUploading ? `Uploading... ${currentProgress}%` : 'Upload File'}
          </button>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-200 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-200 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
    </div>
  );
});

DocumentUpload.displayName = 'DocumentUpload';

export default DocumentUpload;
