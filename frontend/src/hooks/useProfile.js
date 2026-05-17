import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

export const useProfile = () => {
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

    const isOwner = !!profileData?.viewer && profileData?.viewer?.id === profileData?.target?.id;

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

    return {
        profileData,
        isLoading,
        selectedProject,
        setSelectedProject,
        slideshowIndex,
        setSlideshowIndex,
        isCropping,
        setIsCropping,
        cropImage,
        isUploadingPic,
        fileInputRef,
        cameraInputRef,
        pfpInputRef,
        cropImgRef,
        isOwner,
        handleDeleteNote,
        handleFileUpload,
        handlePfpChange,
        handleSaveCrop
    };
};
