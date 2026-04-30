import React, { useState, useRef } from 'react';
import axios from '../../api/client';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './ImageUpload.css';
import SmartImage from './SmartImage';

/**
 * ImageUpload Component
 * 
 * @param {string} uploadUrl - API endpoint to upload to
 * @param {string} fieldName - Form field name for the file
 * @param {string} initialImage - Initial image URL to display
 * @param {function} onUploadSuccess - Callback with server response { new_url, filename }
 * @param {string} label - Display label
 * @param {string} secondaryLabel - Display secondary text
 */
const ImageUpload = ({ 
  uploadUrl, 
  fieldName = 'file', 
  initialImage = null, 
  onUploadSuccess = () => {}, 
  label = 'Upload Image',
  secondaryLabel = 'PNG, JPG or GIF (max. 5MB)'
}) => {
  const [preview, setPreview] = useState(initialImage);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large (max 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });

      // Backend returns { status: 'success', data: { new_url, filename } }
      if (response.data.status === 'success') {
        const { new_url, filename } = response.data.data;
        setSuccess(true);
        onUploadSuccess({ new_url, filename });
      } else {
        setError(response.data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.error || 'Server error during upload';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(initialImage);
    setSuccess(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="image-upload-wrapper">
      <div className="image-upload-header">
        <span className="image-upload-label">{label}</span>
      </div>
      
      <div 
        className={`image-upload-container ${isUploading ? 'uploading' : ''} ${error ? 'error' : ''} ${success ? 'success' : ''}`}
        onClick={() => !isUploading && fileInputRef.current.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*"
          hidden 
        />
        
        {preview ? (
          <div className="image-preview-overlay">
            <SmartImage 
              src={preview} 
              alt="Upload preview" 
              className="preview-img" 
              fallbackType="project"
            />
            <div className="preview-controls">
              {!isUploading && (
                <button 
                  className="remove-btn" 
                  onClick={(e) => { e.stopPropagation(); clearPreview(); }}
                  title="Remove image"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon-circle">
              <Upload size={24} className="upload-icon" />
            </div>
            <p className="upload-text">Click to upload or drag and drop</p>
            <p className="upload-hint">{secondaryLabel}</p>
          </div>
        )}

        {isUploading && (
          <div className="upload-progress-overlay">
            <div className="progress-content">
              <Loader2 className="spinner" />
              <span>{progress}%</span>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {success && !isUploading && (
          <div className="upload-status-badge success">
            <CheckCircle size={14} />
            <span>Success</span>
          </div>
        )}
      </div>

      {error && (
        <div className="upload-error-message">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
