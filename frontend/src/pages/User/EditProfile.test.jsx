import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditProfile from './EditProfile';
import useAuthStore from '../../store/useAuthStore';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: vi.fn(),
    },
    writable: true
});

let blobCounter = 0;
window.URL.createObjectURL = vi.fn(() => `blob:mock-url-${++blobCounter}`);
window.URL.revokeObjectURL = vi.fn();

const pngFile = (name = 'test.png') => new File(['dummy content'], name, { type: 'image/png' });
const fileInput = () => screen.getByLabelText('Change Photo');
const pickFile = (file) => fireEvent.change(fileInput(), { target: { files: [file] } });
const submit = () => fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

describe('EditProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        server.use(
            http.get('*/user/api/parent-code', () => HttpResponse.json({ data: { connection_code: 'DEFAULT-CODE' } }))
        );

        useAuthStore.setState({
            user: {
                id: 1,
                username: 'testuser',
                nickname: 'Test Nick',
                bio: 'This is my bio',
                role: 'student',
                profile_picture: 'pic.jpg',
                drawer: 'Drawer A1'
            },
            checkAuth: vi.fn(),
            isAuthenticated: true,
            isChecking: false
        });
    });

    it('renders user details correctly and disables nickname for student', async () => {
        server.use(
            http.get('*/user/api/parent-code', () => {
                return HttpResponse.json({ data: { connection_code: 'ABCD-1234' } });
            })
        );

        render(<EditProfile />);

        expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Nick')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter your nickname/i)).toBeDisabled();
        expect(screen.getByText('Nickname (readonly)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('This is my bio')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Drawer A1')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByDisplayValue('ABCD-1234')).toBeInTheDocument();
        });
    });

    it('handles connection code copy', async () => {
        server.use(
            http.get('*/user/api/parent-code', () => {
                return HttpResponse.json({ data: { connection_code: 'ABCD-1234' } });
            })
        );

        render(<EditProfile />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('ABCD-1234')).toBeInTheDocument();
        });

        const copyBtn = screen.getByTitle('Copy Code');
        fireEvent.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABCD-1234');
        expect(toast.success).toHaveBeenCalledWith('Code copied to clipboard!');
    });

    it('updates inputs and shows save/cancel buttons when bio is changed', () => {
        render(<EditProfile />);
        
        expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();

        const bioInput = screen.getByPlaceholderText(/Tell us about yourself\.\.\./i);
        fireEvent.change(bioInput, { target: { value: 'New Bio' } });

        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('cancels changes', () => {
        render(<EditProfile />);
        
        const bioInput = screen.getByPlaceholderText(/Tell us about yourself\.\.\./i);
        fireEvent.change(bioInput, { target: { value: 'New Bio' } });

        const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelBtn);

        expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();
        expect(bioInput.value).toBe('This is my bio');
    });

    it('toggles password visibility', () => {
        render(<EditProfile />);

        const passInput = screen.getByPlaceholderText(/^New Password/i);
        const confirmInput = screen.getByPlaceholderText(/confirm new password/i);

        expect(passInput).toHaveAttribute('type', 'password');
        expect(confirmInput).toHaveAttribute('type', 'password');

        const toggleBtns = screen.getAllByRole("button").filter(b => b.classList.contains("password-toggle-btn"));
        
        fireEvent.click(toggleBtns[0]);
        expect(passInput).toHaveAttribute('type', 'text');

        fireEvent.click(toggleBtns[1]);
        expect(confirmInput).toHaveAttribute('type', 'text');
    });

    it('validates password match', () => {
        render(<EditProfile />);

        fireEvent.change(screen.getByPlaceholderText(/^New Password/i), { target: { value: 'pass123' } });
        fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'pass456' } });

        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        expect(toast.error).toHaveBeenCalledWith('Passwords do not match!');
    });

    it('handles successful profile update for student (without sending nickname)', async () => {
        server.use(
            http.post('*/user/edit_profile', async ({ request }) => {
                const body = await request.json();
                expect(body.nickname).toBeUndefined();
                expect(body.bio).toBe('New Bio');
                return HttpResponse.json({ success: true });
            })
        );

        render(<EditProfile />);

        fireEvent.change(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i), { target: { value: 'New Bio' } });
        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();

        await waitFor(() => {
            
        });
    });

    it('allows non-student to edit nickname and sends nickname in payload', async () => {
        useAuthStore.setState({
            user: {
                id: 3,
                username: 'parentuser',
                nickname: 'Parent Nick',
                bio: 'Parent bio',
                role: 'parent',
                profile_picture: 'pic.jpg',
            },
            checkAuth: vi.fn(),
            isAuthenticated: true,
            isChecking: false
        });

        server.use(
            http.post('*/user/edit_profile', async ({ request }) => {
                const body = await request.json();
                expect(body.nickname).toBe('New Parent Nick');
                return HttpResponse.json({ success: true });
            })
        );

        render(<EditProfile />);

        const nicknameInput = screen.getByPlaceholderText(/Enter your nickname/i);
        expect(nicknameInput).not.toBeDisabled();

        fireEvent.change(nicknameInput, { target: { value: 'New Parent Nick' } });
        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        await waitFor(() => {
            
        });
    });

    it('handles file change', async () => {
        render(<EditProfile />);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        const fileInput = screen.getByLabelText('Change Photo');
        
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(window.URL.createObjectURL).toHaveBeenCalledWith(file);
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });

    it('handles successful profile picture update and info update together', async () => {
        server.use(
            http.post('*/user/api/profile-picture', async () => {
                return HttpResponse.json({ success: true });
            }),
            http.post('*/user/edit_profile', async () => {
                return HttpResponse.json({ success: true });
            })
        );

        render(<EditProfile />);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        const fileInput = screen.getByLabelText('Change Photo');
        fireEvent.change(fileInput, { target: { files: [file] } });

        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        await waitFor(() => {
            
        });
    });

    it('handles update failure', async () => {
        server.use(
            http.post('*/user/edit_profile', () => {
                return HttpResponse.json({ error: 'Failed to save' }, { status: 400 });
            })
        );

        render(<EditProfile />);

        fireEvent.change(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i), { target: { value: 'New Bio' } });
        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to save');
        });
    });

    describe('form state', () => {
        const parentCodeHandler = (counter) => http.get('*/user/api/parent-code', () => {
            counter.calls += 1;
            return HttpResponse.json({ data: { connection_code: 'ABCD-1234' } });
        });

        it('keeps unsaved edits and the photo preview when the auth store swaps in a fresh user object', async () => {
            const counter = { calls: 0 };
            server.use(parentCodeHandler(counter));
            render(<EditProfile />);
            await waitFor(() => expect(screen.getByDisplayValue('ABCD-1234')).toBeInTheDocument());

            fireEvent.change(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i), { target: { value: 'Draft bio' } });
            pickFile(pngFile());
            const previewBefore = screen.getByAltText('Profile Preview').getAttribute('src');
            expect(previewBefore).toMatch(/^blob:/);

            // What every background checkAuth() does: a brand-new user object, same account.
            act(() => {
                useAuthStore.setState({ user: { ...useAuthStore.getState().user, drawer: 'Drawer B2' } });
            });

            expect(screen.getByDisplayValue('Drawer B2')).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i).value).toBe('Draft bio');
            expect(screen.getByAltText('Profile Preview').getAttribute('src')).toBe(previewBefore);
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
            expect(counter.calls).toBe(1);
        });

        it('re-initialises the form and refetches the connection code when a different user signs in', async () => {
            const counter = { calls: 0 };
            server.use(parentCodeHandler(counter));
            render(<EditProfile />);
            await waitFor(() => expect(counter.calls).toBe(1));

            act(() => {
                useAuthStore.setState({
                    user: { id: 2, username: 'other', nickname: 'Other Nick', bio: 'Other bio', role: 'student', profile_picture: null },
                });
            });

            expect(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i).value).toBe('Other bio');
            expect(screen.getByDisplayValue('Other Nick')).toBeInTheDocument();
            expect(screen.getByAltText('Profile Preview').getAttribute('src')).toContain('Default_pfp.jpg');
            await waitFor(() => expect(counter.calls).toBe(2));
        });

        it('does not fetch a connection code for parents', async () => {
            const counter = { calls: 0 };
            server.use(parentCodeHandler(counter));
            useAuthStore.setState({
                user: { id: 3, username: 'parentuser', nickname: 'Parent Nick', bio: '', role: 'parent', profile_picture: 'pic.jpg' },
            });
            render(<EditProfile />);

            expect(screen.getByDisplayValue('Parent Nick')).toBeInTheDocument();
            expect(screen.queryByText('Pairing Code & Connection')).not.toBeInTheDocument();
            expect(counter.calls).toBe(0);
        });

        it('resyncs the form and preview from the refreshed user after a successful save', async () => {
            const refreshed = {
                id: 1, username: 'testuser', nickname: 'Test Nick', bio: 'Saved bio', role: 'student',
                profile_picture: 'new-pic.png', drawer: 'Drawer A1',
            };
            useAuthStore.setState({ checkAuth: vi.fn(async () => useAuthStore.setState({ user: refreshed })) });
            server.use(
                http.post('*/user/edit_profile', () => HttpResponse.json({ status: 'success', data: { message: 'ok' } })),
                http.post('*/user/api/profile-picture', () => HttpResponse.json({ status: 'success', data: { filename: 'new-pic.png' } }))
            );
            render(<EditProfile />);

            fireEvent.change(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i), { target: { value: 'Saved bio' } });
            pickFile(pngFile());
            const blobUrl = screen.getByAltText('Profile Preview').getAttribute('src');
            submit();

            await waitFor(() => expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument());
            expect(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i).value).toBe('Saved bio');
            expect(screen.getByAltText('Profile Preview').getAttribute('src')).toContain('/user/profile_pictures/new-pic.png');
            expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
        });
    });

    describe('saving', () => {
        it('saves the info before uploading the picture', async () => {
            const calls = [];
            server.use(
                http.post('*/user/edit_profile', () => {
                    calls.push('info');
                    return HttpResponse.json({ status: 'success', data: { message: 'ok' } });
                }),
                http.post('*/user/api/profile-picture', () => {
                    calls.push('picture');
                    return HttpResponse.json({ status: 'success', data: { filename: 'x.png' } });
                })
            );
            render(<EditProfile />);

            pickFile(pngFile());
            submit();

            await waitFor(() => expect(calls).toEqual(['info', 'picture']));
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('does not touch the avatar when saving the info fails', async () => {
            let pictureCalls = 0;
            server.use(
                http.post('*/user/edit_profile', () => HttpResponse.json(
                    { status: 'error', data: null, error: 'An error occurred while updating the profile.' }, { status: 500 }
                )),
                http.post('*/user/api/profile-picture', () => {
                    pictureCalls += 1;
                    return HttpResponse.json({ status: 'success', data: {} });
                })
            );
            render(<EditProfile />);

            pickFile(pngFile());
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('An error occurred while updating the profile.'));
            expect(pictureCalls).toBe(0);
            // The chosen photo stays selected so nothing is lost.
            expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
        });

        it('reports a failed photo upload separately, keeps the photo, and lets the user retry', async () => {
            let pictureOk = false;
            server.use(
                http.post('*/user/edit_profile', () => HttpResponse.json({ status: 'success', data: { message: 'ok' } })),
                http.post('*/user/api/profile-picture', () => (pictureOk
                    ? HttpResponse.json({ status: 'success', data: { filename: 'x.png' } })
                    : HttpResponse.json({ status: 'error', data: null, error: 'File too large. Maximum size is 5MB.' }, { status: 400 })))
            );
            render(<EditProfile />);

            fireEvent.change(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i), { target: { value: 'New Bio' } });
            pickFile(pngFile());
            const blobUrl = screen.getByAltText('Profile Preview').getAttribute('src');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
                'Profile saved, but the photo upload failed: File too large. Maximum size is 5MB.'
            ));
            // The photo is still pending: preview kept, blob not revoked, save offered again.
            await waitFor(() => expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled());
            expect(screen.getByAltText('Profile Preview').getAttribute('src')).toBe(blobUrl);
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();

            pictureOk = true;
            submit();
            await waitFor(() => expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument());
            expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
        });

        it('falls back to a generic photo-failure message when the server gives no reason', async () => {
            server.use(
                http.post('*/user/edit_profile', () => HttpResponse.json({ status: 'success', data: { message: 'ok' } })),
                http.post('*/user/api/profile-picture', () => HttpResponse.error())
            );
            render(<EditProfile />);

            pickFile(pngFile());
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
                'Profile saved, but the photo upload failed. Please try again.'
            ));
        });

        it('shows the envelope error when the server rejects mismatched passwords', async () => {
            server.use(
                http.post('*/user/edit_profile', () => HttpResponse.json(
                    { status: 'error', data: null, error: 'Passwords do not match.' }, { status: 400 }
                ))
            );
            render(<EditProfile />);

            // Equal on the client, so the request goes out and the server's verdict is shown.
            fireEvent.change(screen.getByPlaceholderText(/^New Password/i), { target: { value: 'pass12345' } });
            fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'pass12345' } });
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Passwords do not match.'));
        });

        it('falls back to a generic message when the error body has no usable text', async () => {
            server.use(
                http.post('*/user/edit_profile', () => HttpResponse.json({ error: { code: 7 } }, { status: 500 }))
            );
            render(<EditProfile />);

            fireEvent.change(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i), { target: { value: 'New Bio' } });
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to update profile.'));
        });
    });

    describe('profile picture selection', () => {
        it('rejects files that are not png, jpeg, gif or webp', () => {
            render(<EditProfile />);

            pickFile(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));

            expect(toast.error).toHaveBeenCalledWith('Please choose a PNG, JPG, GIF or WebP image.');
            expect(URL.createObjectURL).not.toHaveBeenCalled();
            expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();
        });

        it('rejects images over 5MB', () => {
            render(<EditProfile />);

            const big = pngFile('big.png');
            Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
            pickFile(big);

            expect(toast.error).toHaveBeenCalledWith('That image is too large. The maximum size is 5MB.');
            expect(URL.createObjectURL).not.toHaveBeenCalled();
            expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();
        });

        it('accepts an image of exactly 5MB', () => {
            render(<EditProfile />);

            const limit = pngFile('limit.png');
            Object.defineProperty(limit, 'size', { value: 5 * 1024 * 1024 });
            pickFile(limit);

            expect(toast.error).not.toHaveBeenCalled();
            expect(URL.createObjectURL).toHaveBeenCalledWith(limit);
        });

        it('ignores a cleared file selection', () => {
            render(<EditProfile />);

            fireEvent.change(fileInput(), { target: { files: [] } });

            expect(URL.createObjectURL).not.toHaveBeenCalled();
            expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();
        });

        it('revokes the previous preview URL when another photo is chosen', () => {
            render(<EditProfile />);

            pickFile(pngFile('a.png'));
            const first = screen.getByAltText('Profile Preview').getAttribute('src');
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();

            pickFile(pngFile('b.png'));
            expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
            expect(URL.revokeObjectURL).toHaveBeenCalledWith(first);
        });

        it('revokes the preview URL on cancel and restores the saved photo', () => {
            render(<EditProfile />);

            pickFile(pngFile());
            const blobUrl = screen.getByAltText('Profile Preview').getAttribute('src');
            fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

            expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
            expect(screen.getByAltText('Profile Preview').getAttribute('src')).toContain('/user/profile_pictures/pic.jpg');
        });

        it('revokes the preview URL on unmount', () => {
            const { unmount } = render(<EditProfile />);

            pickFile(pngFile());
            const blobUrl = screen.getByAltText('Profile Preview').getAttribute('src');
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
            unmount();

            expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
        });
    });
});
