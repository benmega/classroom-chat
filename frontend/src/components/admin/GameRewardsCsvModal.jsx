import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Download, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import client from '../../api/client';
import './GameRewardsCsvModal.css';

const GameRewardsCsvModal = ({ isOpen, onClose }) => {
  const [csvFile, setCsvFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCsvFile(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleDownloadSampleCsv = async () => {
    setIsDownloadingSample(true);
    try {
      const response = await client.get('/api/admin/level-games/sample-csv', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample_level_games.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Sample CSV downloaded.');
    } catch (err) {
      console.error('Failed to download sample CSV:', err);
      toast.error('Failed to download sample CSV.');
    } finally {
      setIsDownloadingSample(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please choose a .csv file');
        return;
      }
      setCsvFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please drop a .csv file');
        return;
      }
      setCsvFile(file);
    }
  };

  const handleUploadCsv = async (e) => {
    if (e) e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file first.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await client.post('/api/admin/level-games/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success || res.status === 200 || res.status === 201) {
        const inserted = res.data?.inserted ?? res.data?.total_rows ?? '';
        toast.success(`CSV uploaded successfully! ${inserted ? `${inserted} games saved.` : ''}`);
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
      } else {
        toast.error(res.data?.message || 'Failed to upload CSV.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to upload CSV.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Game Rewards CSV" maxWidth="560px">
      <div className="csv-modal-container">
        {/* Sample Download Toolbar */}
        <div className="csv-modal-intro">
          <p className="csv-modal-description">
            Upload a CSV file to update game rewards.
          </p>
          <button
            type="button"
            className="secondary-btn btn-download-sample"
            onClick={handleDownloadSampleCsv}
            disabled={isDownloadingSample}
          >
            <Download size={15} />
            <span>{isDownloadingSample ? 'Downloading...' : 'Sample CSV'}</span>
          </button>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div 
          role="button"
          tabIndex={0}
          className={`csv-dropzone ${isDragging ? 'is-dragging' : ''} ${csvFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !csvFile && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!csvFile) fileInputRef.current?.click();
            }
          }}
          aria-label="CSV file upload dropzone"
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {csvFile ? (
            <div className="csv-file-selected">
              <div className="file-info-col">
                <FileText size={24} className="file-icon" />
                <div className="file-details">
                  <span className="file-name">{csvFile.name}</span>
                  <span className="file-size">{(csvFile.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                onClick={(e) => {
                  e.stopPropagation();
                  setCsvFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                title="Remove selected file"
                aria-label="Remove selected file"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="csv-dropzone-prompt">
              <UploadCloud size={32} className="upload-icon" />
              <p className="prompt-main">
                Drag and drop your <strong>.csv</strong> file here, or <span className="browse-link">browse</span>
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="modal-actions d-flex justify-end gap-md mt-1rem">
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            disabled={!csvFile || isUploading}
            onClick={handleUploadCsv}
          >
            <UploadCloud size={16} />
            <span>{isUploading ? 'Uploading...' : 'Upload CSV'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GameRewardsCsvModal;
