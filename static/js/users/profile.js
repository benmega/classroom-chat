/*
File: profile.js
Type: js
Summary: Handles Profile Picture cropping, Project Modals, Video Lightbox, Skill management, and Note Uploads (Camera & File).
*/

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Profile Picture Editor (if on owner page)
    if (document.getElementById("edit-pic-trigger")) {
        if (typeof Cropper === 'undefined') {
            console.warn('Cropper.js not loaded yet, waiting...');
            let checkInterval = setInterval(() => {
                if (typeof Cropper !== 'undefined') {
                    clearInterval(checkInterval);
                    initProfileEditor();
                }
            }, 100);
        } else {
            initProfileEditor();
        }
    }

    // 2. Initialize Project Modals & Video Lightbox
    initProjectInteractions();

    // 3. Initialize Skill Removal
    initSkillRemoval();

    // 4. Handle Deep Link Modal Opening
    initDeepLinkModal();

    // 5. Initialize Note Upload (Camera & File)
    initNoteUpload();

    // 6. Slide show
    initNoteSlideshow();
});

/* =========================================
   PROJECT MODAL & VIDEO LIGHTBOX LOGIC
   ========================================= */

function initProjectInteractions() {
    // --- Project Modal Logic ---
    const body = document.body;

    // Open Project Modal (Event Delegation)
    document.addEventListener('click', (e) => {
        // Handle Opening Project Modal (Thumbnails and "Case Study" buttons)
        const trigger = e.target.closest('.js-open-project-modal');
        if (trigger) {
            const modalId = trigger.getAttribute('data-target');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
                body.style.overflow = 'hidden'; // Prevent background scrolling
            }
        }

        // Handle Closing Project Modal (Close button or Overlay background)
        if (e.target.classList.contains('project-modal-overlay') || e.target.closest('.js-close-project-modal')) {
            const modal = e.target.closest('.project-modal-overlay') || e.target.closest('.project-modal-content').parentElement;
            if (modal) {
                modal.style.display = 'none';
                body.style.overflow = 'auto';
            }
        }
    });

    // --- Video Lightbox Logic ---
    const lightbox = document.getElementById('video-lightbox');
    const iframe = document.getElementById('lightbox-iframe');
    const closeVideoBtn = document.querySelector('.js-close-video-lightbox');

    if (lightbox && iframe) {
        // Open Video
        document.addEventListener('click', (e) => {
            const videoTrigger = e.target.closest('.js-open-video-lightbox');
            if (videoTrigger) {
                e.preventDefault(); // Prevent default anchor behavior
                e.stopPropagation(); // Stop bubbling to project modal

                const rawUrl = videoTrigger.getAttribute('data-video-url');
                if (rawUrl) {
                    const embedUrl = convertToEmbedUrl(rawUrl);
                    iframe.src = embedUrl;
                    lightbox.style.display = 'flex';
                }
            }
        });

        // Close Video Helper
        const closeVideo = () => {
            lightbox.style.display = 'none';
            iframe.src = ""; // Stop playback
        };

        // Close events
        if (closeVideoBtn) closeVideoBtn.addEventListener('click', closeVideo);

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeVideo();
        });
    }
}

/**
 * Helper: Converts YouTube/Vimeo links to Autoplay Embed Links
 */
function convertToEmbedUrl(url) {
    let embedUrl = url;

    // Handle YouTube
    if (url.includes("youtube.com/watch?v=")) {
        let videoId = url.split("v=")[1];
        const ampersandPosition = videoId.indexOf("&");
        if (ampersandPosition !== -1) {
            videoId = videoId.substring(0, ampersandPosition);
        }
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    else if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1];
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    // Handle Vimeo
    else if (url.includes("vimeo.com/")) {
        const videoId = url.split("vimeo.com/")[1];
        embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }

    return embedUrl;
}


/* =========================================
   SKILL REMOVAL LOGIC
   ========================================= */

function initSkillRemoval() {
    document.addEventListener('click', async function(e) {
        if (e.target.classList.contains('remove-skill')) {
            e.preventDefault();

            if(!confirm("Are you sure you want to remove this skill?")) return;

            const skillId = e.target.dataset.skillId;
            const skillTag = e.target.closest('.skill-tag') || e.target.closest('.skill-card-visual');

            // Note: Since this is an external JS file, we cannot use Jinja's {{ csrf_token() }}.
            // You must ensure a meta tag exists: <meta name="csrf-token" content="{{ csrf_token() }}">
            const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfTokenMeta ? csrfTokenMeta.getAttribute('content') : '';

            try {
                const response = await fetch(`/user/remove_skill/${skillId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    }
                });

                if (response.ok) {
                    if(skillTag) skillTag.remove();
                    showNotification('Skill removed successfully', 'success');
                } else {
                    showNotification('Failed to remove skill', 'error');
                }
            } catch (error) {
                console.error(error);
                showNotification('Error removing skill', 'error');
            }
        }
    });
}


/* =========================================
   PROFILE PICTURE EDITOR LOGIC
   ========================================= */

function initProfileEditor() {
    const fileInput = document.getElementById("file-input");
    const preview = document.getElementById("preview");
    const modal = document.getElementById("crop-modal");
    const closeBtn = document.getElementById("close-modal");
    const cropBtn = document.getElementById("crop-btn");
    const editTrigger = document.getElementById("edit-pic-trigger");
    const currentImg = document.getElementById("current-profile-img");

    if (!fileInput || !modal) return; // Guard clause

    let cropper = null;

    const CONFIG = {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        cropSize: { width: 300, height: 300 },
        acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        uploadEndpoint: '/user/edit_profile_picture'
    };

    function init() {
        editTrigger.addEventListener("click", handleEditClick);
        fileInput.addEventListener("change", handleFileSelect);
        closeBtn.addEventListener("click", closeModal);
        modal.addEventListener("click", handleModalClick);
        document.addEventListener("keydown", handleKeyDown);
        cropBtn.addEventListener("click", handleCropAndUpload);
    }

    function handleEditClick() {
        fileInput.click();
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const validation = validateFile(file);
        if (!validation.valid) {
            showError(validation.error);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            displayImageForCropping(event.target.result);
        };
        reader.onerror = () => {
            showError('Failed to read the selected file.');
        };
        reader.readAsDataURL(file);
    }

    function validateFile(file) {
        if (!CONFIG.acceptedTypes.includes(file.type)) {
            return {
                valid: false,
                error: 'Please select a valid image file (JPEG, PNG, GIF, or WebP).'
            };
        }
        if (file.size > CONFIG.maxFileSize) {
            return {
                valid: false,
                error: 'File size must be less than 10MB.'
            };
        }
        return { valid: true };
    }

    function displayImageForCropping(imageSrc) {
        preview.src = imageSrc;
        modal.style.display = "block";
        preview.onload = () => {
            initializeCropper();
        };
        preview.onerror = () => {
            showError('Failed to load the selected image.');
            closeModal();
        };
    }

    function initializeCropper() {
        if (typeof Cropper === 'undefined') {
            console.error('Cropper.js is not loaded');
            showError('Image editor failed to load. Please refresh and try again.');
            return;
        }

        if (cropper) {
            cropper.destroy();
            cropper = null;
        }

        try {
            cropper = new Cropper(preview, {
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
                toggleDragModeOnDblclick: false,
                minCropBoxWidth: 100,
                minCropBoxHeight: 100,
                background: false,
                ready() {
                    cropBtn.disabled = false;
                },
                error(err) {
                    console.error('Cropper error:', err);
                    showError('Failed to initialize image editor.');
                }
            });
        } catch (error) {
            console.error('Failed to create Cropper instance:', error);
            showError('Failed to initialize image editor.');
        }
    }

    function closeModal() {
        modal.style.display = "none";
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        fileInput.value = '';
        resetCropButton();
        modal.classList.remove('loading');
    }

    function handleModalClick(e) {
        if (e.target === modal) {
            closeModal();
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Escape" && modal.style.display === "block") {
            closeModal();
        }
    }

    function handleCropAndUpload() {
        if (!cropper) {
            showError('Image editor is not ready.');
            return;
        }
        setLoadingState(true);

        try {
            const canvas = cropper.getCroppedCanvas({
                width: CONFIG.cropSize.width,
                height: CONFIG.cropSize.height,
                minWidth: 200, minHeight: 200,
                maxWidth: 500, maxHeight: 500,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            if (!canvas) throw new Error('Failed to crop image');

            canvas.toBlob((blob) => {
                if (!blob) {
                    showError('Failed to process image.');
                    setLoadingState(false);
                    return;
                }
                uploadImage(blob);
            }, "image/jpeg", 0.9);

        } catch (error) {
            console.error('Cropping error:', error);
            showError('Failed to crop image.');
            setLoadingState(false);
        }
    }

    function uploadImage(blob) {
        const formData = new FormData();
        formData.append("profile_picture", blob, "profile.jpg");

        const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
        const headers = { 'X-Requested-With': 'XMLHttpRequest' };
        if (csrfTokenMeta) {
            headers['X-CSRFToken'] = csrfTokenMeta.getAttribute('content');
        }

        fetch(CONFIG.uploadEndpoint, {
            method: "POST",
            body: formData,
            headers: headers
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success && data.new_url) {
                updateProfileImage(data.new_url);
                closeModal();
                showSuccess('Profile picture updated successfully!');
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            showError('Upload failed: ' + error.message);
        })
        .finally(() => {
            setLoadingState(false);
        });
    }

    function updateProfileImage(newUrl) {
        const urlWithTimestamp = newUrl + '?t=' + Date.now();
        currentImg.src = urlWithTimestamp;
        currentImg.style.opacity = '0';
        setTimeout(() => {
            currentImg.style.opacity = '1';
        }, 50);
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            cropBtn.disabled = true;
            cropBtn.textContent = "Processing...";
            modal.classList.add('loading');
        } else {
            resetCropButton();
            modal.classList.remove('loading');
        }
    }

    function resetCropButton() {
        cropBtn.disabled = false;
        cropBtn.textContent = "Crop & Save";
    }

    init();
}

/* =========================================
   UTILITIES
   ========================================= */

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    const styles = {
        position: 'fixed', top: '20px', right: '20px',
        padding: '15px 20px', borderRadius: '5px',
        zIndex: '10000', boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        fontSize: '14px', fontWeight: '500',
        maxWidth: '300px', wordWrap: 'break-word'
    };

    if (type === 'success') {
        styles.background = '#2ecc71'; styles.color = 'white';
    } else if (type === 'error') {
        styles.background = '#e74c3c'; styles.color = 'white';
    }

    Object.assign(notification.style, styles);
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) notification.remove();
    }, 4000);
}

function initDeepLinkModal() {
    const hash = window.location.hash;
    // Check if the hash matches the pattern #modal-ID
    if (hash && hash.startsWith('#modal-')) {
        const modalId = hash.substring(1); // Removes the '#'
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            window.scrollTo(0, 0);
        }
    }
}


/* =========================================
   NOTEBOOK UPLOAD LOGIC (UPDATED)
   ========================================= */

function initNoteUpload() {
    // Elements for Standard Upload
    const uploadBtn = document.getElementById('upload-note-btn');
    const fileInput = document.getElementById('note-file-input');

    // Elements for Camera Upload
    const camBtn = document.getElementById('camera-note-btn');
    const camInput = document.getElementById('camera-note-input');

    if (!uploadBtn && !camBtn) return;

    // --- Shared Upload Handler ---
    const handleNoteUpload = async (file, buttonElement) => {
        if (!file) return;

        // Basic Validation
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showNotification('Invalid file type. Please upload an image.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('note_image', file);

        // UI Feedback: Disable button and show spinner on the triggered button
        const originalContent = buttonElement ? buttonElement.innerHTML : '';
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        try {
            const response = await fetch('/notes/upload_note', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Note uploaded successfully!', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showNotification(data.error || 'Upload failed.', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('An error occurred during upload.', 'error');
        } finally {
            // Reset UI
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = originalContent;
            }
            // Clear inputs so change event fires again for same file
            if (fileInput) fileInput.value = '';
            if (camInput) camInput.value = '';
        }
    };

    // --- 1. Standard File Upload Logic ---
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                handleNoteUpload(e.target.files[0], uploadBtn);
            }
        });
    }

    // --- 2. Camera Upload Logic ---
    if (camBtn && camInput) {
        const video = document.getElementById('webcam-stream');
        const canvas = document.getElementById('temp-canvas');
        const camModal = document.getElementById('camera-modal');
        const closeCamBtn = document.getElementById('close-camera-modal');
        let mediaStream = null;

        // Helper to stop camera & close modal
        const closeCameraModal = () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
                mediaStream = null;
            }
            camModal.style.display = 'none';
        };

        closeCamBtn.addEventListener('click', closeCameraModal);

        camBtn.addEventListener('click', async () => {
            // Mobile: use native camera
            if (/Mobi|Android/i.test(navigator.userAgent)) {
                camInput.click();
                return;
            }

            // Desktop: Open Modal and start stream
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = mediaStream;
                camModal.style.display = 'block';

                document.getElementById('snap-btn').onclick = () => {
                    // 1. Visual Flash Effect
                    video.style.transition = 'opacity 0.1s ease-out';
                    video.style.opacity = 0;
                    setTimeout(() => video.style.opacity = 1, 150);

                    // 2. Capture Canvas
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0);

                    // 3. Create File with Unique Timestamp
                    canvas.toBlob((blob) => {
                        const uniqueFilename = `webcam_${Date.now()}.jpg`; // <-- Fixes the overwrite bug
                        const file = new File([blob], uniqueFilename, { type: "image/jpeg" });

                        handleNoteUpload(file, camBtn);
                        closeCameraModal();
                    }, 'image/jpeg');
                };
            } catch (err) {
                showNotification('Camera access denied or not found.', 'error');
            }
        });
    }
}

document.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-note-btn');
    if (!deleteBtn) return;

    if (!confirm("Are you sure you want to delete this note? This cannot be undone.")) return;

    const noteId = deleteBtn.getAttribute('data-note-id');
    const noteItem = deleteBtn.closest('.note-item');

    // Disable button and show spinner
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`/notes/delete/${noteId}`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            noteItem.remove(); // Remove image from UI instantly
            showNotification('Note deleted successfully', 'success');

            // Show "No notes" message if that was the last one
            const grid = document.getElementById('note-grid-container');
            if (grid.querySelectorAll('.note-item').length === 0) {
                grid.innerHTML = '<p class="no-data-msg">No notes uploaded yet.</p>';
            }
        } else {
            showNotification(data.error || 'Failed to delete note', 'error');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.disabled = false;
        }
    } catch (error) {
        showNotification('An error occurred.', 'error');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.disabled = false;
    }
});

/* =========================================
   NOTE SLIDESHOW LOGIC
   ========================================= */
function initNoteSlideshow() {
    const lightbox = document.getElementById('slideshow-lightbox');
    const imgEl = document.getElementById('slideshow-img');
    const images = Array.from(document.querySelectorAll('.js-open-slideshow'));
    let currentIndex = 0;

    if (!lightbox || images.length === 0) return;

    const showImage = (index) => {
        currentIndex = (index + images.length) % images.length; // Loop around
        imgEl.src = images[currentIndex].getAttribute('data-url');
        lightbox.style.display = 'flex';
    };

    // Open Slideshow
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('js-open-slideshow')) {
            showImage(parseInt(e.target.getAttribute('data-index')));
        }
    });

    // Navigation
    document.getElementById('next-slide').onclick = (e) => { e.stopPropagation(); showImage(currentIndex + 1); };
    document.getElementById('prev-slide').onclick = (e) => { e.stopPropagation(); showImage(currentIndex - 1); };

    // Close
    const closeLightbox = () => lightbox.style.display = 'none';
    document.querySelector('.js-close-slideshow').onclick = closeLightbox;
    lightbox.onclick = (e) => { if (e.target === lightbox) closeLightbox(); };

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (lightbox.style.display !== 'none') {
            if (e.key === 'ArrowRight') showImage(currentIndex + 1);
            if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
            if (e.key === 'Escape') closeLightbox();
        }
    });
}