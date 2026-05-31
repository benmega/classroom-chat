import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import { formatStaticUrl } from '../utils/formatters';
import { extractVideoThumbnail } from '../utils/video';

export const useProjectManagement = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    
    const [projectData, setProjectData] = useState({
        name: '',
        description: '',
        link: '',
        github_link: '',
        video_url: '',
        code_snippet: '',
        teacher_comment: '',
        student_id: ''
    });
    
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [projectImage, setProjectImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [projectVideo, setProjectVideo] = useState(null);
    const [isCustomImage, setIsCustomImage] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [studentRes, projectRes] = await Promise.all([
                    currentUser?.is_admin ? client.get('/user/project/new') : Promise.resolve(null),
                    projectId ? client.get(`/user/project/edit/${projectId}`) : Promise.resolve(null)
                ]);

                if (studentRes) {
                    setStudents(studentRes.data.data.students || []);
                }

                if (projectRes && projectRes.data.status === 'success') {
                    const p = projectRes.data.data.project;
                    setProjectData({
                        name: p.name || '',
                        description: p.description || '',
                        link: p.link || '',
                        github_link: p.github_link || '',
                        video_url: p.video_url || '',
                        code_snippet: p.code_snippet || '',
                        teacher_comment: p.teacher_comment || '',
                        student_id: p.user_id || ''
                    });
                    if (p.image_url) {
                        setImagePreview(formatStaticUrl(p.image_url));
                        setIsCustomImage(true);
                    }
                }
            } catch (error) {
                console.error('Error fetching project data:', error);
                if (error.response?.status === 403) {
                    setError('forbidden');
                } else if (error.response?.status === 404) {
                    setError('not_found');
                } else {
                    toast.error('Failed to load project details.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId, currentUser]);

    const adjustTextareaHeight = (target) => {
        if (!target) return;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProjectData(prev => ({ ...prev, [name]: value }));
        
        if (e.target.tagName.toLowerCase() === 'textarea') {
            adjustTextareaHeight(e.target);
        }
    };

    const handleFileChange = async (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            if (name === 'project_image') {
                setProjectImage(files[0]);
                setImagePreview(URL.createObjectURL(files[0]));
                setIsCustomImage(true);
            } else if (name === 'project_video') {
                setProjectVideo(files[0]);
                
                if (!isCustomImage) {
                    try {
                        const thumbnailBlob = await extractVideoThumbnail(files[0]);
                        const thumbnailFile = new File([thumbnailBlob], "video_thumbnail.jpg", { type: "image/jpeg" });
                        setProjectImage(thumbnailFile);
                        setImagePreview(URL.createObjectURL(thumbnailFile));
                        toast.success('Generated thumbnail from video!');
                    } catch (err) {
                        console.error('Failed to extract thumbnail:', err);
                    }
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const formData = new FormData();
        Object.entries(projectData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        });

        if (projectImage) formData.append('project_image', projectImage);
        if (projectVideo) formData.append('project_video', projectVideo);

        try {
            const url = projectId ? `/user/project/edit/${projectId}` : '/user/project/new';
            const response = await client.post(url, formData);

            if (response.data.status === 'success') {
                toast.success(projectId ? 'Project updated!' : 'Project created!');
                
                if (currentUser?.is_admin && projectData.student_id) {
                    const student = students.find(s => String(s.id) === String(projectData.student_id));
                    if (student?.slug) {
                        navigate(`/profile/${student.slug}`);
                        return;
                    }
                }
                
                navigate('/profile');
            } else {
                toast.error(response.data.error || 'Failed to save project.');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.response?.data?.error || 'An error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this project?')) return;
        
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('action', 'delete');
            const response = await client.post(`/user/project/edit/${projectId}`, formData);
            if (response.data.status === 'success') {
                toast.success('Project deleted.');
                
                if (currentUser?.is_admin && projectData.student_id) {
                    const student = students.find(s => String(s.id) === String(projectData.student_id));
                    if (student?.slug) {
                        navigate(`/profile/${student.slug}`);
                        return;
                    }
                }

                navigate('/profile');
            }
        } catch {
            toast.error('Failed to delete project.');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        projectId,
        projectData,
        students,
        isLoading,
        isSaving,
        imagePreview,
        projectVideo,
        error,
        handleInputChange,
        handleFileChange,
        handleSubmit,
        handleDelete,
        adjustTextareaHeight,
        navigate
    };
};
