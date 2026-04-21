import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import './Profile.css';
import '../../assets/css/sprite.css'; 
import ContributionGraph from '../../components/profile/ContributionGraph';

// New sub-components
import ProfileHeader from '../../components/profile/ProfileHeader';
import CourseProgress from '../../components/profile/CourseProgress';
import CertificationsList from '../../components/profile/CertificationsList';
import AchievementsList from '../../components/profile/AchievementsList';
import TechnicalSkills from '../../components/profile/TechnicalSkills';
import ProjectPortfolio from '../../components/profile/ProjectPortfolio';
import DigitalNotebook from '../../components/profile/DigitalNotebook';
import ProjectModal from '../../components/profile/ProjectModal';
import NoteSlideshow from '../../components/profile/NoteSlideshow';
import PfpCropModal from '../../components/profile/PfpCropModal';

const Profile = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { checkAuth } = useAuthStore();
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [slideshowIndex, setSlideshowIndex] = useState(null);
    
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const pfpInputRef = useRef(null);

    // Profile Picture Cropping State
    const [isCropping, setIsCropping] = useState(false);
    const [cropImage, setCropImage] = useState(null);
    const [isUploadingPic, setIsUploadingPic] = useState(false);
    const cropperRef = useRef(null);
    const cropImgRef = useRef(null);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const endpoint = slug ? `/user/profile/${slug}` : '/user/profile';
            const response = await client.get(endpoint);
            setProfileData(response.data.data);
        } catch {
            toast.error('Failed to load profile.');
            if (!slug) navigate('/login');
        } finally {
            setIsLoading(false);
        }
    }, [navigate, slug]);

    useEffect(() => {
        fetchProfile();
    }, [slug, fetchProfile]);

    const isOwner = profileData?.viewer?.id === profileData?.target?.id || profileData?.viewer?.is_admin;

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await client.post(`/notes/delete/${noteId}`);
            toast.success('Note deleted.');
            setProfileData(prev => ({
                ...prev,
                target: {
                    ...prev.target,
                    notes: prev.target.notes.filter(n => n.id !== noteId)
                }
            }));
        } catch {
            toast.error('Failed to delete note.');
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('note', file);

        try {
            const response = await client.post('/notes/upload', formData);
            if (response.data.status === 'success') {
                toast.success('Note uploaded!');
                fetchProfile();
            }
        } catch {
            toast.error('Upload failed.');
        }
    };

    const handlePfpChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            toast.error('Please select a valid image file (JPG, PNG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropImage(reader.result);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveCrop = async () => {
        if (!cropperRef.current) return;
        setIsUploadingPic(true);

        try {
            const canvas = cropperRef.current.getCroppedCanvas({
                width: 300,
                height: 300,
                imageSmoothingQuality: 'high'
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    toast.error('Failed to process image.');
                    setIsUploadingPic(false);
                    return;
                }

                const formData = new FormData();
                formData.append('profile_picture', blob, 'profile.jpg');

                try {
                    const response = await client.post('/user/api/profile-picture', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    if (response.data.status === 'success') {
                        toast.success('Profile picture updated!');
                        setIsCropping(false);
                        fetchProfile();
                        if (profileData.viewer?.id === profileData.target?.id) {
                            checkAuth();
                        }
                    } else {
                        toast.error(response.data.error || 'Upload failed.');
                    }
                } catch (err) {
                    toast.error(err.response?.data?.error || 'Server error during upload.');
                } finally {
                    setIsUploadingPic(false);
                }
            }, 'image/jpeg', 0.9);
        } catch (err) {
            console.error('Cropping error:', err);
            toast.error('Error cropping image.');
            setIsUploadingPic(false);
        }
    };

    useEffect(() => {
        if (isCropping) {
            const loadCropper = async () => {
                if (typeof window.Cropper === 'undefined') {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/static/lib/cropper.min.css';
                    document.head.appendChild(link);

                    const script = document.createElement('script');
                    script.src = '/static/lib/cropper.min.js';
                    script.async = true;
                    script.onload = () => initCropper();
                    document.body.appendChild(script);
                } else {
                    initCropper();
                }
            };

            const initCropper = () => {
                setTimeout(() => {
                    if (cropImgRef.current) {
                        cropperRef.current = new window.Cropper(cropImgRef.current, {
                            aspectRatio: 1,
                            viewMode: 2,
                            dragMode: 'move',
                            autoCropArea: 0.8,
                            restore: false,
                            guides: true,
                            center: true,
                            highlight: false,
                            cropBoxMovable: true,
                            cropBoxResizable: true,
                            minCropBoxWidth: 100,
                            minCropBoxHeight: 100,
                        });
                    }
                }, 100);
            };

            loadCropper();
        }

        return () => {
            if (cropperRef.current) {
                cropperRef.current.destroy();
                cropperRef.current = null;
            }
        };
    }, [isCropping]);

    if (isLoading) return <div className="profile-loading">Loading Profile...</div>;
    if (!profileData) return <div className="profile-error">Profile not found.</div>;

    const { target } = profileData;

    return (
        <div className="profile-page">
            <ProfileHeader 
                target={target} 
                isOwner={isOwner} 
                pfpInputRef={pfpInputRef}
                onPfpChange={handlePfpChange}
            />

            <div className="dashboard-grid">
                <div className="column-left">
                    {(target.bio || isOwner) ? (
                        <section className="dashboard-panel bio-section">
                            <div className="panel-header">
                                <h2><User size={20} /> About Me</h2>
                            </div>
                            <div className="bio-panel-content">
                                {target.bio ? (
                                    <p className="bio-text">{target.bio}</p>
                                ) : (
                                    <p className="bio-placeholder">
                                        {isOwner 
                                            ? "You haven't added a biography yet. Click 'Edit Profile' to tell your classmates about yourself!" 
                                            : "This student hasn't shared a biography yet."}
                                    </p>
                                )}
                            </div>
                        </section>
                    ) : null}

                    <CourseProgress target={target} />
                    
                    <CertificationsList certificates={target.certificates} />

                    <AchievementsList achievements={target.achievements} />

                    <TechnicalSkills skills={target.skills} />
                </div>

                <div className="column-right">
                    <ProjectPortfolio 
                        projects={target.projects} 
                        isOwner={isOwner} 
                        setSelectedProject={setSelectedProject}
                    />

                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <h2><User size={20} /> Coding Activity</h2>
                        </div>
                        <div className="activity-visual">
                            <ContributionGraph data={target.contribution_data} />
                        </div>
                    </section>

                    <DigitalNotebook 
                        notes={target.notes}
                        isOwner={isOwner}
                        onFileUpload={handleFileUpload}
                        onDeleteNote={handleDeleteNote}
                        setSlideshowIndex={setSlideshowIndex}
                        fileInputRef={fileInputRef}
                        cameraInputRef={cameraInputRef}
                    />
                </div>
            </div>

            <ProjectModal 
                project={selectedProject} 
                onClose={() => setSelectedProject(null)} 
            />

            <NoteSlideshow 
                notes={target.notes}
                currentIndex={slideshowIndex}
                onClose={() => setSlideshowIndex(null)}
                onPrev={() => setSlideshowIndex(i => i > 0 ? i - 1 : target.notes.length - 1)}
                onNext={() => setSlideshowIndex(i => i < target.notes.length - 1 ? i + 1 : 0)}
            />

            <PfpCropModal 
                isCropping={isCropping}
                cropImgRef={cropImgRef}
                cropImage={cropImage}
                isUploadingPic={isUploadingPic}
                onCancel={() => setIsCropping(false)}
                onSave={handleSaveCrop}
            />
        </div>
    );
};

export default Profile;
