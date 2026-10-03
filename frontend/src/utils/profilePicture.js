// Client-side mirror of the profile-picture rules the backend enforces
// (Config.ALLOWED_EXTENSIONS and the 5 MB cap in user_routes.api_edit_profile_picture),
// so a bad file is rejected before the upload instead of after it.
export const PROFILE_PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024;

// Returns an error message for an unusable file, or null when it is acceptable.
export const validateProfilePicture = (file) => {
    if (!PROFILE_PICTURE_TYPES.includes(file.type)) {
        return 'Please choose a PNG, JPG, GIF or WebP image.';
    }
    if (file.size > PROFILE_PICTURE_MAX_BYTES) {
        return 'That image is too large. The maximum size is 5MB.';
    }
    return null;
};
