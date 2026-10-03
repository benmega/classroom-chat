import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showConfirm } from '../utils/confirm';
import { loadCropper } from '../utils/loadCropper';
import { PROFILE_PICTURE_TYPES } from '../utils/profilePicture';
import client from '../api/client';
import { getErrorMessage } from '../utils/apiError';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

export const useProfile = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { checkAuth } = useAuthStore();
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [slideshowIndex, setSlideshowIndex] = useState(null);
    
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const pfpInputRef = useRef(null);

    const [isCropping, setIsCropping] = useState(false);
    const [cropImage, setCropImage] = useState(null);
    const [isUploadingPic, setIsUploadingPic] = useState(false);
    const cropperRef = useRef(null);
    const cropImgRef = useRef(null);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setLoadError(false);
        try {
            const endpoint = slug ? `/user/profile/${slug}` : '/user/profile';
            const response = await client.get(endpoint);
            setProfileData(response.data.data);
        } catch (err) {
            const status = err.response?.status;
            toast.error('Failed to load profile.');
            if (!slug && status === 401) {
                // Not signed in (the api client has already reset the auth state).
                navigate('/login');
            } else if (status !== 404) {
                // A network blip or server error: keep the user here and let them retry.
                setLoadError(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [navigate, slug]);

    useEffect(() => {
        if (slug === 'edit' || slug === 'settings') {
            navigate('/settings', { replace: true });
            return;
        }
        fetchProfile();
    }, [slug, fetchProfile, navigate]);

    const isOwner = !!profileData?.viewer && (profileData?.viewer?.id === profileData?.target?.id || profileData?.viewer?.role === 'admin');

    const handleDeleteNote = async (noteId) => {
        if (!await showConfirm('Delete this note?', { title: 'Delete Note', destructive: true })) return;
        try {
            await client.post(`/notes/delete/${noteId}`);
            
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
                
                fetchProfile();
            }
        } catch {
            toast.error('Upload failed.');
        }
    };

    const handlePfpChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!PROFILE_PICTURE_TYPES.includes(file.type)) {
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
                    const response = await client.post('/user/api/profile-picture', formData);

                    if (response.data.status === 'success') {
                        
                        setIsCropping(false);
                        fetchProfile();
                        if (profileData.viewer?.id === profileData.target?.id) {
                            checkAuth();
                        }
                    } else {
                        toast.error(getErrorMessage({ response }, 'Upload failed.'));
                    }
                } catch (err) {
                    toast.error(getErrorMessage(err, 'Server error during upload.'));
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
        // Closed (or unmounted) while the library was still loading: build nothing.
        let cancelled = false;

        if (isCropping) {
            loadCropper().then((Cropper) => {
                if (cancelled || !cropImgRef.current) return;
                cropperRef.current = new Cropper(cropImgRef.current, {
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
            }).catch((err) => {
                if (cancelled) return;
                console.error('Cropper load error:', err);
                toast.error('Could not load the image editor. Please try again.');
                setIsCropping(false);
            });
        }

        return () => {
            cancelled = true;
            if (cropperRef.current) {
                cropperRef.current.destroy();
                cropperRef.current = null;
            }
        };
    }, [isCropping]);

    return {
        profileData,
        isLoading,
        loadError,
        retryProfile: fetchProfile,
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
