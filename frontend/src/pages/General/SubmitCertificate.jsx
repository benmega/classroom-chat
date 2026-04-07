import React, { useState } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './SubmitCertificate.css';

const SubmitCertificate = () => {
    const [certificateUrl, setCertificateUrl] = useState('');
    const [certificateFile, setCertificateFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState({});

    // Matches https://www.codecombat.com/certificates/[id]?course=[slug]
    const CERT_URL_PATTERN = /^https:\/\/(?:www\.)?(?:codecombat|ozaria)\.com\/certificates\/[\w\d]+\?.*course=[\w\d-]+.*$/;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type === 'application/pdf') {
                setCertificateFile(file);
                // Clear file error if it exists
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.file;
                    return newErrors;
                });
            } else {
                toast.error('Please select a valid PDF file.');
                e.target.value = null;
                setCertificateFile(null);
            }
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!certificateUrl.trim()) {
            newErrors.url = 'Certificate URL is required.';
        } else if (!CERT_URL_PATTERN.test(certificateUrl.trim())) {
            newErrors.url = 'Please enter a valid CodeCombat or Ozaria certificate URL (e.g., https://codecombat.com/certificates/...)';
        }

        if (!certificateFile) {
            newErrors.file = 'Certificate PDF file is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        const formData = new FormData();
        formData.append('certificate_url', certificateUrl);
        formData.append('certificate_file', certificateFile);

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const response = await client.post('/achievements/submit_certificate', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            if (response.data.success) {
                toast.success('Certificate submitted successfully!');
                setCertificateUrl('');
                setCertificateFile(null);
                setUploadProgress(0);
                e.target.reset();
            } else {
                toast.error(response.data.error || 'Submission failed.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('An error occurred during upload. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="submit-certificate-page">
            <div className="form-card">
                <h2 className="form-title">Submit Completion Certificate</h2>
                <p className="form-subtitle">Upload your CodeCombat or Ozaria certificate to earn rewards.</p>

                <form onSubmit={handleSubmit} className="certificate-form">
                    <div className="form-group">
                        <label htmlFor="certificate_url">Certificate URL</label>
                        <input 
                            type="text" 
                            id="certificate_url"
                            value={certificateUrl}
                            onChange={(e) => {
                                setCertificateUrl(e.target.value);
                                if (errors.url) {
                                    setErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors.url;
                                        return newErrors;
                                    });
                                }
                            }}
                            placeholder="https://codecombat.com/certificates/..." 
                            className={`form-control ${errors.url ? 'is-invalid' : ''}`}
                        />
                        {errors.url && <div className="error-message">{errors.url}</div>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="certificate_file">Upload Certificate PDF</label>
                        <div className="file-input-wrapper">
                            <input 
                                type="file" 
                                id="certificate_file"
                                onChange={handleFileChange}
                                accept="application/pdf" 
                                className="file-input"
                            />
                            <div className={`file-dummy ${errors.file ? 'is-invalid' : ''}`}>
                                {certificateFile ? certificateFile.name : 'Choose a PDF file...'}
                            </div>
                        </div>
                        {errors.file && <div className="error-message">{errors.file}</div>}
                    </div>

                    {isUploading && (
                        <div className="progress-container">
                            <div className="progress-bar-wrapper">
                                <div 
                                    className="progress-bar-fill" 
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <span className="progress-text">{uploadProgress}% Uploaded</span>
                        </div>
                    )}

                    <button type="submit" className="submit-button" disabled={isUploading}>
                        {isUploading ? 'Uploading...' : 'Submit Certificate'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SubmitCertificate;
