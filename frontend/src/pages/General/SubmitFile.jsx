import React, { useState } from 'react';
import { UploadCloud, Paperclip, X } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './SubmitChallenge.css';
import './SubmitFile.css';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'zip'];
const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',');
const MAX_NOTE_LENGTH = 500;

const formatFileSize = (bytes) => {
    if (bytes === null || bytes === undefined || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = -1;
    do {
        size /= 1024;
        unitIndex++;
    } while (size >= 1024 && unitIndex < units.length - 1);
    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const SubmitFile = () => {
    const [file, setFile] = useState(null);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [inputKey, setInputKey] = useState(0); // bump to force-remount the file input (can't reset it via ref value)

    const validateFile = (selected) => {
        if (selected.size > MAX_FILE_SIZE) {
            toast.error('That file is too large. Max size is 20MB.');
            return false;
        }

        const parts = selected.name.split('.');
        const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
            toast.error(`Unsupported file type${ext ? ` ".${ext}"` : ''}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
            return false;
        }

        return true;
    };

    const handleFileChange = (e) => {
        const selected = e.target.files && e.target.files[0];
        if (!selected) {
            setFile(null);
            return;
        }

        if (!validateFile(selected)) {
            setFile(null);
            setInputKey((k) => k + 1);
            return;
        }

        setFile(selected);
    };

    const clearFile = () => {
        setFile(null);
        setInputKey((k) => k + 1);
    };

    const resetForm = () => {
        setFile(null);
        setNote('');
        setUploadProgress(0);
        setInputKey((k) => k + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            toast.error('Please choose a file to send.');
            return;
        }

        if (note.length > MAX_NOTE_LENGTH) {
            toast.error(`Note must be ${MAX_NOTE_LENGTH} characters or less.`);
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (note) formData.append('note', note);

            const response = await client.post('/api/submissions', formData, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                onUploadProgress: (progressEvent) => {
                    if (!progressEvent.total) return;
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            if (response.data.status === 'success') {
                toast.success('File sent to your teacher!');
                resetForm();
            } else {
                toast.error(response.data.error || 'Failed to send file.');
            }
        } catch (error) {
            console.error('File submission error:', error);
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to send file.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="submit-file-page">
            <div className="form-card submit-file-card">
                <div className="form-header submit-file-header">
                    <h2 className="form-title submit-file-title">Send a File</h2>
                    <p className="form-description">Share a document, image, or project file directly with your teacher.</p>
                </div>
                <form onSubmit={handleSubmit} className="file-submission-form">
                    <div className="form-group">
                        <label htmlFor="submission-file">File</label>
                        <label htmlFor="submission-file" className="file-drop-zone">
                            <UploadCloud size={28} />
                            {file ? (
                                <span className="file-chip">
                                    <Paperclip size={14} />
                                    <span className="file-chip-name">{file.name}</span>
                                    <span className="file-chip-size">{formatFileSize(file.size)}</span>
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        className="file-chip-remove"
                                        aria-label="Remove selected file"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile(); }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                clearFile();
                                            }
                                        }}
                                    >
                                        <X size={14} />
                                    </span>
                                </span>
                            ) : (
                                <span>Click to choose a file, or drag one here</span>
                            )}
                        </label>
                        <input
                            key={inputKey}
                            type="file"
                            id="submission-file"
                            hidden
                            accept={ACCEPT_ATTR}
                            onChange={handleFileChange}
                        />
                        <span className="file-hint">Allowed: {ALLOWED_EXTENSIONS.join(', ')} &middot; Max 20MB</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="submission-note">Note (optional)</label>
                        <textarea
                            id="submission-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows="3"
                            maxLength={MAX_NOTE_LENGTH}
                            className="form-control"
                            placeholder="Add a short note about this file..."
                        ></textarea>
                        <span className="file-hint file-char-count">{note.length}/{MAX_NOTE_LENGTH}</span>
                    </div>

                    {isSubmitting && uploadProgress > 0 && (
                        <div className="file-progress-container">
                            <div className="file-progress-bar-wrapper">
                                <div
                                    className="file-progress-bar-fill"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <span className="file-progress-text">{uploadProgress}% Uploaded</span>
                        </div>
                    )}

                    <button type="submit" className="submit-button" disabled={isSubmitting || !file}>
                        {isSubmitting ? (
                            <span className="btn-loading">
                                <svg className="spinner" viewBox="0 0 50 50">
                                    <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                                </svg>
                                Sending...
                            </span>
                        ) : 'Send to Teacher'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SubmitFile;
