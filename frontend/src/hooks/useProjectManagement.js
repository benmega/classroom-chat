import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { getErrorMessage } from '../utils/apiError';
import { showConfirm } from '../utils/confirm';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import { formatStaticUrl } from '../utils/formatters';
import { extractVideoThumbnail } from '../utils/video';
import { validateNewFiles } from '../utils/projectFiles';

const PROJECT_TYPES = ['code', '3d'];
// The type a project or template states, or null when it states none we know (an older server sends none)
const knownProjectType = (value) => (PROJECT_TYPES.includes(value) ? value : null);

// The form field each kind of file is uploaded under
const FILE_FIELDS = { model: 'model_files', source: 'source_files', asset: 'asset_files' };
const FILE_KIND_LIST = Object.keys(FILE_FIELDS);
const NO_PENDING_FILES = { model: [], source: [], asset: [] };

// A picked folder can hold hundreds of files the project cannot take. Past this many, the remaining
// rejections are counted in one toast instead of burying the page.
const MAX_REJECTION_TOASTS = 3;

// Folders nobody means to publish with a project: installed dependencies and caches (hidden folders such
// as .git are skipped as well). Left in, they would use up the file cap before the student's own files.
const SKIPPED_FOLDERS = new Set(['node_modules', '__pycache__', 'venv']);

// Where a file sits inside the project: its place in a picked folder, top folder included, else its name
const relativePathOf = (file) => file.webkitRelativePath || file.name;

const isSkippedInFolder = (file) => {
    if (!file.webkitRelativePath) return false;
    const folders = file.webkitRelativePath.split('/');
    const name = folders.pop();
    // The first folder is the one the student picked, so its own name never counts against it
    return name.startsWith('.') || folders.slice(1).some((folder) => folder.startsWith('.') || SKIPPED_FOLDERS.has(folder));
};

const SNAPSHOT_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export const useProjectManagement = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const studentIdParam = searchParams.get('student_id');
    const { user: currentUser } = useAuthStore();
    const isAdmin = currentUser?.role === 'admin';
    
    const [projectData, setProjectData] = useState({
        name: '',
        description: '',
        link: '',
        github_link: '',
        video_url: '',
        code_snippet: '',
        teacher_comment: '',
        status: 'pending',
        student_id: studentIdParam || ''
    });
    
    const [students, setStudents] = useState([]);
    const [templates, setTemplates] = useState({});
    const [selectedTemplate, setSelectedTemplate] = useState('custom');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [projectImage, setProjectImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [projectVideo, setProjectVideo] = useState(null);
    const [isCustomImage, setIsCustomImage] = useState(false);
    const [error, setError] = useState(null);
    const [projectType, setProjectTypeState] = useState('code');
    const [existingFiles, setExistingFiles] = useState([]);
    const [pendingFiles, setPendingFiles] = useState(NO_PENDING_FILES);
    const [removedFileIds, setRemovedFileIds] = useState(() => new Set());
    const [pendingModelPreviewUrl, setPendingModelPreviewUrl] = useState(null);
    // Percent of the request body sent while a save carries files, else null
    const [uploadProgress, setUploadProgress] = useState(null);
    // The object URL behind the current image preview, if it was made from a local file
    // (a preview of the saved server image is a plain URL and needs no cleanup).
    const previewBlobRef = useRef(null);
    const isMountedRef = useRef(true);
    // The pending files as last set, for a second pick that arrives before React has re-rendered
    const pendingFilesRef = useRef(NO_PENDING_FILES);
    // The first pending model and the object URL that previews it
    const modelPreviewRef = useRef({ file: null, url: null });
    // isCustomImage for a model snapshot that resolves after the student picked a cover of their own
    const customCoverRef = useRef(false);
    const nextLocalFileIdRef = useRef(1);

    const revokePreviewBlob = useCallback(() => {
        if (previewBlobRef.current) {
            URL.revokeObjectURL(previewBlobRef.current);
            previewBlobRef.current = null;
        }
    }, []);

    const revokeModelPreview = useCallback(() => {
        if (modelPreviewRef.current.url) {
            URL.revokeObjectURL(modelPreviewRef.current.url);
        }
        modelPreviewRef.current = { file: null, url: null };
    }, []);

    // Previews a local file, releasing the blob URL of the one it replaces.
    // A video thumbnail can finish extracting after the page is gone: that late
    // preview must not create a blob URL nothing would ever release.
    const setPreviewFromFile = useCallback((file) => {
        if (!isMountedRef.current) return;
        revokePreviewBlob();
        previewBlobRef.current = URL.createObjectURL(file);
        setImagePreview(previewBlobRef.current);
    }, [revokePreviewBlob]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            revokePreviewBlob();
            revokeModelPreview();
        };
    }, [revokePreviewBlob, revokeModelPreview]);

    useEffect(() => {
        if (!projectId && studentIdParam) {
            setProjectData(prev => ({ ...prev, student_id: studentIdParam }));
        }
    }, [projectId, studentIdParam]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [studentRes, projectRes, templatesRes] = await Promise.all([
                    isAdmin ? client.get('/user/project/new') : Promise.resolve(null),
                    projectId ? client.get(`/user/project/edit/${projectId}`) : Promise.resolve(null),
                    client.get('/api/project-templates')
                ]);

                const fetchedTemplates = templatesRes?.data?.data?.templates || {};
                setTemplates(fetchedTemplates);

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
                        status: p.status || 'pending',
                        student_id: p.user_id || ''
                    });
                    if (p.image_url) {
                        revokePreviewBlob();
                        setImagePreview(formatStaticUrl(p.image_url));
                        setIsCustomImage(true);
                        customCoverRef.current = true;
                    }
                    setExistingFiles(Array.isArray(p.files) ? p.files : []);
                    
                    // Preselect the template this project was built from: by template_id
                    // when present, else by exact (case-insensitive) name for older projects.
                    let matchingTemplate = 'custom';
                    const templateNames = Object.keys(fetchedTemplates);
                    if (p.template_id != null) {
                        const byId = templateNames.find(t => String(fetchedTemplates[t]?.id) === String(p.template_id));
                        if (byId) matchingTemplate = byId;
                    } else if (p.name) {
                        const byName = templateNames.find(t => t.toLowerCase() === p.name.toLowerCase());
                        if (byName) matchingTemplate = byName;
                    }
                    setSelectedTemplate(matchingTemplate);
                    setProjectTypeState(
                        knownProjectType(p.project_type)
                        || knownProjectType(fetchedTemplates[matchingTemplate]?.project_type)
                        || 'code'
                    );
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
    }, [projectId, isAdmin, revokePreviewBlob]);

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

    const handleTemplateChange = (e) => {
        const template = e.target.value;
        setSelectedTemplate(template);
        if (template !== 'custom') {
            setProjectData(prev => ({ 
                ...prev, 
                name: template,
                description: templates[template]?.description || ''
            }));
            // A template decides what kind of project it is
            setProjectTypeState(knownProjectType(templates[template]?.project_type) || 'code');
        } else {
            setProjectData(prev => ({ ...prev, name: '' }));
        }
    };

    const setProjectType = (value) => {
        const type = knownProjectType(value);
        if (type) setProjectTypeState(type);
    };

    const handleFileChange = async (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            if (name === 'project_image') {
                setProjectImage(files[0]);
                setPreviewFromFile(files[0]);
                setIsCustomImage(true);
                customCoverRef.current = true;
            } else if (name === 'project_video') {
                setProjectVideo(files[0]);
                
                if (!isCustomImage) {
                    try {
                        const thumbnailBlob = await extractVideoThumbnail(files[0]);
                        const thumbnailFile = new File([thumbnailBlob], "video_thumbnail.jpg", { type: "image/jpeg" });
                        setProjectImage(thumbnailFile);
                        setPreviewFromFile(thumbnailFile);
                        toast.success('Generated thumbnail from video!');
                    } catch (err) {
                        console.error('Failed to extract thumbnail:', err);
                    }
                }
            }
        }
    };

    const handleRecordedVideo = async (blob) => {
        const file = new File([blob], `recorded_video_${Date.now()}.webm`, { type: 'video/webm' });
        setProjectVideo(file);
        
        if (!isCustomImage) {
            try {
                const thumbnailBlob = await extractVideoThumbnail(file);
                const thumbnailFile = new File([thumbnailBlob], "video_thumbnail.jpg", { type: "image/jpeg" });
                setProjectImage(thumbnailFile);
                setPreviewFromFile(thumbnailFile);
                toast.success('Generated thumbnail from recording!');
            } catch (err) {
                console.error('Failed to extract thumbnail:', err);
            }
        }
    };

    // The viewer previews one model: the first pending one. Its object URL is made when that file
    // changes and released when it is replaced, removed or the page goes away.
    const syncModelPreview = (firstModel) => {
        if (modelPreviewRef.current.file === firstModel) return;
        revokeModelPreview();
        if (firstModel && isMountedRef.current) {
            modelPreviewRef.current = { file: firstModel, url: URL.createObjectURL(firstModel) };
        }
        setPendingModelPreviewUrl(modelPreviewRef.current.url);
    };

    const commitPendingFiles = (next) => {
        pendingFilesRef.current = next;
        setPendingFiles(next);
        syncModelPreview(next.model[0]?.file ?? null);
    };

    const reportRejections = (rejected) => {
        rejected.slice(0, MAX_REJECTION_TOASTS).forEach(({ file, reason }) => {
            const text = reason || 'This file cannot be added.';
            // Name the file when the reason does not, so one rejection among many picked files can be traced
            toast.error(text.includes(file.name) ? text : `${file.name}: ${text}`);
        });
        const unreported = rejected.length - MAX_REJECTION_TOASTS;
        if (unreported > 0) {
            toast.error(`${unreported} more ${unreported === 1 ? 'file was' : 'files were'} not added.`);
        }
    };

    const addFiles = (kind, fileList) => {
        if (!FILE_FIELDS[kind]) return;
        const picked = Array.from(fileList || []).filter((file) => !isSkippedInFolder(file));
        if (picked.length === 0) return;

        // A file picked again under a path already pending takes the place of the earlier pick
        const incoming = new Map(picked.map((file) => [relativePathOf(file), file]));
        const current = pendingFilesRef.current;
        const otherPending = FILE_KIND_LIST.flatMap((k) => current[k].filter((entry) => k !== kind || !incoming.has(entry.path)));
        // The caps count the saved files that survive the save: not marked for removal, and not replaced
        // by an upload to the same path (the server replaces those)
        const uploadPaths = new Set([...otherPending.map((entry) => entry.path), ...incoming.keys()]);
        const keptSaved = existingFiles.filter((file) => !removedFileIds.has(file.id) && !uploadPaths.has(file.path));

        const { accepted, rejected } = validateNewFiles(kind, [...incoming.values()], {
            existing: keptSaved,
            pendingAdds: otherPending.map((entry) => entry.file),
        });
        reportRejections(rejected);
        if (accepted.length === 0) return;

        const added = accepted
            .map((file) => ({ id: nextLocalFileIdRef.current++, file, path: relativePathOf(file) }))
            .sort((a, b) => a.path.localeCompare(b.path));
        const addedByPath = new Map(added.map((entry) => [entry.path, entry]));
        const earlierPaths = new Set(current[kind].map((entry) => entry.path));
        commitPendingFiles({
            ...current,
            [kind]: [
                ...current[kind].map((entry) => addedByPath.get(entry.path) ?? entry),
                ...added.filter((entry) => !earlierPaths.has(entry.path)),
            ],
        });
    };

    const removePendingFile = (kind, localId) => {
        const current = pendingFilesRef.current;
        if (!current[kind]) return;
        commitPendingFiles({ ...current, [kind]: current[kind].filter((entry) => entry.id !== localId) });
    };

    // Marks a saved file for removal on save, or keeps it again
    const toggleRemoveExisting = (fileId) => {
        setRemovedFileIds((prev) => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                next.add(fileId);
            }
            return next;
        });
    };

    // The page hands over a frame of the 3D model once its viewer has drawn it. That frame becomes the
    // cover only while the project has no cover of its own (a saved one or one the student picked).
    const setCoverFromModelSnapshot = useCallback((blob) => {
        if (!blob || customCoverRef.current || !isMountedRef.current) return false;
        const extension = SNAPSHOT_EXTENSIONS[blob.type] || 'png';
        const cover = new File([blob], `model_cover.${extension}`, { type: blob.type || 'image/png' });
        setProjectImage(cover);
        setPreviewFromFile(cover);
        toast.success('Made a cover image from your 3D model!');
        return true;
    }, [setPreviewFromFile]);

    // What the project will hold once saved, per kind: the saved files it keeps plus the pending ones
    const pendingPaths = new Set(FILE_KIND_LIST.flatMap((kind) => pendingFiles[kind].map((entry) => entry.path)));
    const fileCounts = { model: pendingFiles.model.length, source: pendingFiles.source.length, asset: pendingFiles.asset.length };
    existingFiles.forEach((file) => {
        if (file.kind in fileCounts && !removedFileIds.has(file.id) && !pendingPaths.has(file.path)) {
            fileCounts[file.kind] += 1;
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const formData = new FormData();
        Object.entries(projectData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        });
        formData.append('project_type', projectType);

        // Link the project to its template so renaming it later can't break the link.
        // A custom project is only sent explicitly (as "null") when editing, to clear a link;
        // on create the server links exact name matches itself.
        const templateId = selectedTemplate !== 'custom' ? templates[selectedTemplate]?.id : null;
        if (templateId != null) {
            formData.append('template_id', templateId);
        } else if (projectId && Object.keys(templates).length > 0) {
            formData.append('template_id', 'null');
        }

        if (projectImage) formData.append('project_image', projectImage);
        if (projectVideo) formData.append('project_video', projectVideo);
        // The part's file name carries the path inside the project, so an uploaded folder keeps its layout
        FILE_KIND_LIST.forEach((kind) => {
            pendingFiles[kind].forEach(({ file, path }) => formData.append(FILE_FIELDS[kind], file, path));
        });
        removedFileIds.forEach((id) => formData.append('remove_file_ids', id));

        // Only a save that carries files can take long enough for its progress to be worth showing
        const sendsFiles = Boolean(projectImage || projectVideo) || FILE_KIND_LIST.some((kind) => pendingFiles[kind].length > 0);
        const trackUpload = (event) => {
            if (event.total) setUploadProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        };
        if (sendsFiles) setUploadProgress(0);

        try {
            const url = projectId ? `/user/project/edit/${projectId}` : '/user/project/new';
            const isResubmit = projectData.status === 'rejected';
            const response = sendsFiles
                ? await client.post(url, formData, { onUploadProgress: trackUpload })
                : await client.post(url, formData);

            if (response.data.status === 'success') {
                if (response.data.data?.video_processing) {
                    toast.success(isResubmit ? 'Project resubmitted! Your video is being processed in the background.' : 'Project saved! Your video is being processed in the background.');
                } else {
                    toast.success(isResubmit ? 'Project resubmitted for review!' : (projectId ? 'Project updated!' : 'Project created!'));
                }

                if (currentUser?.role === 'admin' && projectData.student_id) {
                    const student = students.find(s => String(s.id) === String(projectData.student_id));
                    if (student?.slug) {
                        navigate(`/profile/${student.slug}`);
                        return;
                    }
                }

                navigate('/profile');
            } else {
                toast.error(getErrorMessage({ response }, 'Failed to save project.'));
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error(getErrorMessage(error, 'An error occurred.'));
        } finally {
            setIsSaving(false);
            setUploadProgress(null);
        }
    };

    const handleDelete = async () => {
        if (!await showConfirm('Are you sure you want to delete this project?', { title: 'Delete Project', destructive: true })) return;
        
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('action', 'delete');
            const response = await client.post(`/user/project/edit/${projectId}`, formData);
            if (response.data.status === 'success') {
                
                
                if (currentUser?.role === 'admin' && projectData.student_id) {
                    const student = students.find(s => String(s.id) === String(projectData.student_id));
                    if (student?.slug) {
                        navigate(`/profile/${student.slug}`);
                        return;
                    }
                }

                navigate('/profile');
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to delete project.'));
        } finally {
            setIsSaving(false);
        }
    };

    return {
        projectId,
        projectData,
        students,
        templates,
        selectedTemplate,
        isLoading,
        isSaving,
        imagePreview,
        projectVideo,
        isCustomImage,
        error,
        projectType,
        setProjectType,
        existingFiles,
        pendingFiles,
        removedFileIds,
        fileCounts,
        pendingModelPreviewUrl,
        uploadProgress,
        handleInputChange,
        handleTemplateChange,
        handleFileChange,
        handleRecordedVideo,
        addFiles,
        removePendingFile,
        toggleRemoveExisting,
        setCoverFromModelSnapshot,
        handleSubmit,
        handleDelete,
        adjustTextareaHeight,
        navigate
    };
};
