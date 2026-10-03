import client from '../api/client';
import toast from 'react-hot-toast';
import { showConfirm } from '../utils/confirm';
import { getErrorMessage } from '../utils/apiError';
import adminCache from '../utils/adminCache';

// Mirrors create_user in backend/application/routes/admin/user_mgmt.py, which strips and
// lower-cases the username before matching it. The server stays the authority.
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

// Each validator returns an error message, or '' when the value is acceptable.
export const validateUsername = (value) => {
    const username = (value ?? '').trim().toLowerCase();
    if (!username) return 'Username is required';
    if (!USERNAME_PATTERN.test(username)) return '3-30 chars, lowercase, numbers, or underscores.';
    return '';
};

export const validateAmount = (value) => (
    String(value ?? '').trim() ? '' : 'Adjustment amount is required'
);

// Returns an errors object keyed by field name (empty when the pair is acceptable).
export const validatePasswordPair = (newPassword, confirmPassword) => {
    const errors = {};
    if (!newPassword) errors.new_password = 'New password is required';
    if (!confirmPassword) errors.confirm_password = 'Confirmation is required';
    else if (newPassword && newPassword !== confirmPassword) errors.confirm_password = 'Passwords do not match';
    return errors;
};

// A user change makes the cached user lists and dashboard figures stale.
const invalidateUserCaches = () => {
    adminCache.invalidate('admin_users');
    adminCache.invalidate('admin_dashboard');
};

// The admin user actions shared by the Users page and the per-user dashboard. Each page keeps
// its own loading / form-error state and passes the setters in; without setFormErrors a failed
// validation is shown as a toast instead. Every action resolves to true once the server accepted
// it (after calling onSuccess) and to false otherwise.
export const useAdminUserActions = ({ setFormLoading = () => {}, setFormErrors } = {}) => {
    const reportInvalid = (errors) => {
        if (setFormErrors) setFormErrors(errors);
        else toast.error(Object.values(errors)[0]);
    };

    const submit = async (errors, request, fallback, onSuccess) => {
        if (Object.keys(errors).length > 0) {
            reportInvalid(errors);
            return false;
        }

        if (setFormErrors) setFormErrors({});
        setFormLoading(true);
        try {
            const response = await request();
            if (response.data?.success) {
                invalidateUserCaches();
                onSuccess?.();
                return true;
            }
            // A 2xx answer that is not a success still carries the server's reason.
            toast.error(response.data?.message || fallback);
        } catch (error) {
            toast.error(getErrorMessage(error, fallback));
        } finally {
            setFormLoading(false);
        }
        return false;
    };

    const createUser = (formData, onSuccess) => {
        const username = formData.get('username')?.trim() || '';
        const password = formData.get('password')?.trim() || '';
        formData.set('username', username);
        formData.set('password', password);

        const errors = {};
        const usernameError = validateUsername(username);
        if (usernameError) errors.username = usernameError;
        if (!password) errors.password = 'Initial password is required';

        return submit(errors, () => client.post('/api/admin/create_user', formData), 'Failed to create user.', onSuccess);
    };

    const adjustDucks = (formData, onSuccess) => {
        const amountError = validateAmount(formData.get('amount'));
        return submit(
            amountError ? { amount: amountError } : {},
            () => client.post('/api/admin/adjust_ducks', formData),
            'Failed to adjust ducks.',
            onSuccess
        );
    };

    const adjustPackets = (formData, onSuccess) => {
        const amountError = validateAmount(formData.get('amount'));
        return submit(
            amountError ? { amount: amountError } : {},
            () => client.post('/api/admin/adjust_packets', formData),
            'Failed to adjust packets.',
            onSuccess
        );
    };

    const resetPassword = ({ username, new_password, confirm_password }, onSuccess) => submit(
        validatePasswordPair(new_password, confirm_password),
        () => client.post('/api/admin/reset_password', { username, new_password }),
        'Failed to reset password.',
        onSuccess
    );

    const removeUser = async (username, onSuccess) => {
        if (!await showConfirm(`Are you sure you want to PERMANENTLY remove @${username}? This cannot be undone.`, { title: 'Remove User', confirmText: 'Remove', destructive: true })) return false;

        try {
            const formData = new FormData();
            formData.append('username', username);
            const response = await client.post('/api/admin/remove_user', formData);
            if (response.data?.success) {
                invalidateUserCaches();
                onSuccess?.();
                return true;
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to remove user.'));
        }
        return false;
    };

    return { createUser, adjustDucks, adjustPackets, resetPassword, removeUser };
};
