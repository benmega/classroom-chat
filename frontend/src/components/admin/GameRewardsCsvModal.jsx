import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UploadCloud, Download, FileText, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw, Star, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import client from '../../api/client';
import './GameRewardsCsvModal.css';

const GameRewardsCsvModal = ({ isOpen, onClose }) => {
  const [csvFile, setCsvFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);
  const [games, setGames] = useState([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const fileInputRef = useRef(null);

  const fetchGames = useCallback(async () => {
    setIsLoadingGames(true);
    try {
      const res = await client.get('/api/admin/level-games');
      setGames(res.data?.games || []);
    } catch (err) {
      console.error('Failed to fetch level games:', err);
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCsvFile(null);
      setIsDragging(false);
      fetchGames();
    }
  }, [isOpen, fetchGames]);

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
        fetchGames();
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

  const distinctLessonsCount = new Set(games.map(g => g.assigned_lesson).filter(Boolean)).size;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎮 Game Rewards Management (CSV Upload)" maxWidth="740px">
      <div className="csv-modal-container">
        {/* Top Header & Sample Download */}
        <div className="csv-modal-intro">
          <p className="csv-modal-description">
            Upload a CSV spreadsheet of games unlocked as students complete milestone lessons.
          </p>
          <button
            type="button"
            className="btn-download-sample"
            onClick={handleDownloadSampleCsv}
            disabled={isDownloadingSample}
          >
            <Download size={15} />
            <span>{isDownloadingSample ? 'Downloading...' : 'Download Sample CSV'}</span>
          </button>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div 
          className={`csv-dropzone ${isDragging ? 'is-dragging' : ''} ${csvFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !csvFile && fileInputRef.current?.click()}
          role="region"
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
                <FileText size={28} className="file-icon" />
                <div className="file-details">
                  <span className="file-name">{csvFile.name}</span>
                  <span className="file-size">{(csvFile.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <div className="file-actions-row">
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
            </div>
          ) : (
            <div className="csv-dropzone-prompt">
              <UploadCloud size={36} className="upload-icon" />
              <p className="prompt-main">
                Drag and drop your <strong>.csv</strong> file here, or <span className="browse-link">browse</span>
              </p>
              <p className="prompt-sub">Supports columns: game_name, game_url, assigned_lesson, comment, requires_account, rating</p>
            </div>
          )}
        </div>

        {/* Upload Action Button */}
        <div className="csv-upload-actions">
          <button
            type="button"
            className="btn-upload-submit"
            disabled={!csvFile || isUploading}
            onClick={handleUploadCsv}
          >
            <UploadCloud size={16} />
            <span>{isUploading ? 'Uploading CSV...' : 'Upload & Process CSV'}</span>
          </button>
        </div>

        {/* Breakdown & Currently Uploaded Games */}
        <div className="csv-games-section">
          <div className="csv-games-header">
            <div className="csv-games-title-group">
              <h4>Currently Uploaded Games</h4>
              <span className="games-total-pill">{games.length} total</span>
            </div>
            <button 
              type="button" 
              className="btn-refresh-games" 
              onClick={fetchGames}
              disabled={isLoadingGames}
              title="Refresh games list"
              aria-label="Refresh games list"
            >
              <RefreshCw size={14} className={isLoadingGames ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Breakdown summary pills */}
          <div className="csv-breakdown-stats">
            <div className="breakdown-stat-chip">
              <span className="stat-label">Total Games:</span>
              <span className="stat-value">{games.length}</span>
            </div>
            <div className="breakdown-stat-chip">
              <span className="stat-label">Milestones Covered:</span>
              <span className="stat-value">{distinctLessonsCount}</span>
            </div>
            <div className="breakdown-stat-chip">
              <span className="stat-label">Rated Games:</span>
              <span className="stat-value">{games.filter(g => g.rating).length}</span>
            </div>
            <div className="breakdown-stat-chip">
              <span className="stat-label">Requires Account:</span>
              <span className="stat-value">{games.filter(g => g.requires_account).length}</span>
            </div>
          </div>

          {/* Mini table */}
          <div className="csv-table-container">
            {isLoadingGames ? (
              <div className="table-loading-msg">Loading current games...</div>
            ) : games.length === 0 ? (
              <div className="table-empty-msg">
                No game rewards uploaded yet. Upload a CSV above to add sandbox arcade games.
              </div>
            ) : (
              <table className="csv-mini-table">
                <thead>
                  <tr>
                    <th>Game Name</th>
                    <th>Assigned Lesson</th>
                    <th>Rating</th>
                    <th>Account?</th>
                    <th>URL</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g, idx) => (
                    <tr key={g.id || `${g.game_name}-${idx}`}>
                      <td className="cell-game-name" title={g.game_name}>
                        {g.game_name}
                      </td>
                      <td>
                        <span className="cell-lesson-tag">{g.assigned_lesson || 'General'}</span>
                      </td>
                      <td>
                        {g.rating ? (
                          <span className="cell-rating">
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            {g.rating}
                          </span>
                        ) : (
                          <span className="cell-muted">-</span>
                        )}
                      </td>
                      <td>
                        {g.requires_account ? (
                          <span className="cell-account-yes" title="Requires Account">
                            <Lock size={12} /> Yes
                          </span>
                        ) : (
                          <span className="cell-muted">No</span>
                        )}
                      </td>
                      <td>
                        <a
                          href={g.game_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cell-link"
                          title={g.game_url}
                        >
                          Link <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default GameRewardsCsvModal;
