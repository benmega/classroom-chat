import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { Loader2, LogOut } from 'lucide-react';
import SmartImage from '../../components/common/SmartImage';
import CameraModal from '../../components/profile/CameraModal';
import { getApiUrl } from '../../utils/apiUrl';
import './KioskUpload.css';

const KioskUpload = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingFor, setUploadingFor] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const fileInputRef = useRef(null);

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    useEffect(() => {
        const fetchClassroom = async () => {
            try {
                const res = await client.get(`/api/admin/classrooms/${classId}`);
                setClassroom(res.data.classroom);
            } catch (err) {
                console.error('Failed to fetch classroom for kiosk:', err);
                toast.error('Failed to load classroom.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchClassroom();
    }, [classId]);

    const handleStudentClick = (studentId) => {
        setUploadingFor(studentId);
        if (isMobile) {
            if (fileInputRef.current) {
                fileInputRef.current.click();
            }
        } else {
            setIsCameraOpen(true);
        }
    };

    const uploadNoteFile = async (file, studentId) => {
        if (!file || !studentId) {
            setUploadingFor(null);
            return;
        }

        const formData = new FormData();
        formData.append('student_id', studentId);
        formData.append('note_image', file);

        const uploadPromise = client.post('/notes/kiosk-upload', formData);

        toast.promise(uploadPromise, {
            loading: 'Uploading note...',
            success: 'Note uploaded successfully!',
            error: 'Failed to upload note.'
        });

        try {
            await uploadPromise;
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploadingFor(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        await uploadNoteFile(file, uploadingFor);
    };

    const handleCameraCapture = async (file) => {
        await uploadNoteFile(file, uploadingFor);
    };

    const handleExit = () => {
        navigate(`/admin/classes/${classId}`);
    };

    if (isLoading) {
        return (
            <div className="kiosk-container kiosk-loading">
                <Loader2 className="kiosk-spinner" size={48} />
                <p>Loading Kiosk...</p>
            </div>
        );
    }

    if (!classroom) {
        return (
            <div className="kiosk-container kiosk-error">
                <p>Classroom not found.</p>
                <button onClick={handleExit} className="kiosk-btn primary">Exit Kiosk</button>
            </div>
        );
    }

    // Only show students
    const students = classroom.students || [];

    return (
        <div className="kiosk-container">
            <header className="kiosk-header">
                <div className="kiosk-header-info">
                    <h1>{classroom.name} Upload Kiosk</h1>
                    <p>Select your name to upload a photo of your notes.</p>
                </div>
                <button onClick={handleExit} className="kiosk-exit-btn">
                    <LogOut size={20} />
                    <span>Exit Kiosk</span>
                </button>
            </header>

            <main className="kiosk-main">
                <div className="kiosk-grid">
                    {students.map(student => (
                        <div 
                            key={student.id} 
                            className={`kiosk-card ${uploadingFor === student.id ? 'uploading' : ''}`}
                            onClick={() => handleStudentClick(student.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleStudentClick(student.id) }}
                        >
                            <SmartImage 
                                src={student.profile_picture ? getApiUrl(`/user/profile_pictures/${student.profile_picture}`) : ''} 
                                alt={student.nickname || student.username} 
                                className="kiosk-avatar"
                                fallbackType="avatar"
                            />
                            <h3 className="kiosk-name">{student.nickname || student.username}</h3>
                            <p className="kiosk-handle">@{student.username}</p>
                            {uploadingFor === student.id && (
                                <div className="kiosk-upload-overlay">
                                    <Loader2 className="kiosk-spinner" size={32} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {students.length === 0 && (
                    <div className="kiosk-empty">
                        <p>No students enrolled in this classroom.</p>
                    </div>
                )}
            </main>

            <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
            />

            {isCameraOpen && (
                <CameraModal 
                    isOpen={isCameraOpen}
                    onClose={() => {
                        setIsCameraOpen(false);
                        setUploadingFor(null);
                    }}
                    onCapture={handleCameraCapture}
                />
            )}
        </div>
    );
};

export default KioskUpload;
