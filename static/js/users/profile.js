/*
File: profile.js
Type: js
Summary: Profile picture cropping, preview, and upload handling.
*/

document.addEventListener("DOMContentLoaded", () => {
    if (typeof Cropper === 'undefined') {
        console.warn('Cropper.js not loaded yet, waiting...');
        let checkInterval = setInterval(() => {
            if (typeof Cropper !== 'undefined') {
                clearInterval(checkInterval);
                console.log('Cropper.js loaded, initializing profile editor');
                initProfileEditor();
            }
        }, 100);
        return;
    }

    initProfileEditor();
});

function initProfileEditor() {
    const fileInput = document.getElementById("file-input");
    const preview = document.getElementById("preview");
    const modal = document.getElementById("crop-modal");
    const closeBtn = document.getElementById("close-modal");
    const cropBtn = document.getElementById("crop-btn");
    const editTrigger = document.getElementById("edit-pic-trigger");
    const currentImg = document.getElementById("current-profile-img");

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
                error: 'File size must be less than 5MB.'
            };
        }

        return { valid: true };
    }

    /**
     * Display image in modal for cropping
     * @param {string} imageSrc - Base64 image source
     */
    function displayImageForCropping(imageSrc) {
        preview.src = imageSrc;
        modal.style.display = "block";


        // Initialize cropper after image loads
        preview.onload = () => {

            initializeCropper();
        };

        preview.onerror = () => {
            showError('Failed to load the selected image.');
            closeModal();
        };
    }

    /**
     * Initialize Cropper.js with error handling
     */
    function initializeCropper() {
        // Check if Cropper is available
        if (typeof Cropper === 'undefined') {
            console.error('Cropper.js is not loaded');
            showError('Image editor failed to load. Please refresh the page and try again.');
            return;
        }

        // Destroy existing cropper if it exists
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }

        try {
            cropper = new Cropper(preview, {
                aspectRatio: 1, // Square crop
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
                    // Cropper is ready
                    cropBtn.disabled = false;
                    console.log('Cropper initialized successfully');
                },
                error(err) {
                    console.error('Cropper error:', err);
                    showError('Failed to initialize image editor.');
                }
            });
        } catch (error) {
            console.error('Failed to create Cropper instance:', error);
            showError('Failed to initialize image editor. Please refresh the page and try again.');
        }
    }

    /**
     * Close modal and cleanup
     */
    function closeModal() {
        modal.style.display = "none";

        // Destroy cropper
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }

        // Reset file input and button
        fileInput.value = '';
        resetCropButton();

        // Remove loading state
        modal.classList.remove('loading');
    }

    /**
     * Handle modal background click
     * @param {Event} e - Click event
     */
    function handleModalClick(e) {
        if (e.target === modal) {
            closeModal();
        }
    }

    /**
     * Handle keyboard events
     * @param {Event} e - Keyboard event
     */
    function handleKeyDown(e) {
        if (e.key === "Escape" && modal.style.display === "block") {
            closeModal();
        }
    }

    /**
     * Handle crop and upload process
     */
    function handleCropAndUpload() {
        if (!cropper) {
            showError('Image editor is not ready. Please try again.');
            return;
        }

        // Set loading state
        setLoadingState(true);

        try {
            const canvas = cropper.getCroppedCanvas({
                width: CONFIG.cropSize.width,
                height: CONFIG.cropSize.height,
                minWidth: 200,
                minHeight: 200,
                maxWidth: 500,
                maxHeight: 500,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            if (!canvas) {
                throw new Error('Failed to crop image');
            }

            canvas.toBlob((blob) => {
                if (!blob) {
                    showError('Failed to process image. Please try again.');
                    setLoadingState(false);
                    return;
                }

                uploadImage(blob);
            }, "image/jpeg", 0.9); // High quality JPEG

        } catch (error) {
            console.error('Cropping error:', error);
            showError('Failed to crop image. Please try again.');
            setLoadingState(false);
        }
    }

    /**
     * Upload cropped image to server
     * @param {Blob} blob - Cropped image blob
     */
    function uploadImage(blob) {
        const formData = new FormData();
        formData.append("profile_picture", blob, "profile.jpg");

        fetch(CONFIG.uploadEndpoint, {
            method: "POST",
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
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

    /**
     * Update profile image in UI
     * @param {string} newUrl - New image URL
     */
    function updateProfileImage(newUrl) {
        // Add timestamp to avoid cache issues
        const urlWithTimestamp = newUrl + '?t=' + Date.now();
        currentImg.src = urlWithTimestamp;

        // Trigger a re-render to ensure the image updates
        currentImg.style.opacity = '0';
        setTimeout(() => {
            currentImg.style.opacity = '1';
        }, 50);
    }

    /**
     * Set loading state
     * @param {boolean} isLoading - Loading state
     */
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

    /**
     * Reset crop button to default state
     */
    function resetCropButton() {
        cropBtn.disabled = false;
        cropBtn.textContent = "Crop & Save";
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    function showSuccess(message) {
        showNotification(message, 'success');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        showNotification(message, 'error');
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success/error)
     */
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Styling
        const styles = {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '5px',
            zIndex: '10000',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '300px',
            wordWrap: 'break-word'
        };

        // Type-specific styles
        if (type === 'success') {
            styles.background = '#2ecc71';
            styles.color = 'white';
        } else if (type === 'error') {
            styles.background = '#e74c3c';
            styles.color = 'white';
        }

        Object.assign(notification.style, styles);

        document.body.appendChild(notification);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }

    /**
     * Handle skill removal (if needed)
     */
    function initSkillRemoval() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-skill')) {
                e.preventDefault();
                const skillTag = e.target.closest('.skill-tag');
                if (skillTag && confirm('Remove this skill?')) {
                    skillTag.remove();
                    // Here you could also send an AJAX request to update the backend
                }
            }
        });
    }

    // Initialize everything
    init();
    initSkillRemoval();

    // Export functions for potential external use
    window.profileEditor = {
        closeModal,
        showSuccess,
        showError
    };
}


document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('remove-skill')) {
        e.preventDefault();
        const skillId = e.target.dataset.skillId;

        const response = await fetch(`/user/remove_skill/${skillId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': '{{ csrf_token() }}' // if using CSRF
            }
        });

        if (response.ok) {
            e.target.parentElement.remove(); // remove from DOM if backend succeeded
        }
    }
});
