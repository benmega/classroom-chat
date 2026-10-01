import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import PfpCropModal from './PfpCropModal';
import WallpaperCropModal from './WallpaperCropModal';

// The profile-picture and wallpaper croppers share their structure, so one suite covers both.
describe.each([
    ['PfpCropModal', PfpCropModal, 'Adjust Profile Picture'],
    ['WallpaperCropModal', WallpaperCropModal, 'Adjust Wallpaper'],
])('%s', (_, Modal, title) => {
    const renderModal = (props = {}) => {
        const handlers = { onCancel: vi.fn(), onSave: vi.fn() };
        const cropImgRef = React.createRef();
        const utils = render(
            <Modal
                isCropping
                cropImgRef={cropImgRef}
                cropImage="blob:preview"
                isUploadingPic={false}
                {...handlers}
                {...props}
            />
        );
        return { ...utils, ...handlers };
    };

    it('renders nothing when not cropping', () => {
        renderModal({ isCropping: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('is a modal dialog named after its heading', () => {
        renderModal();

        const dialog = screen.getByRole('dialog', { name: title });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    });

    it('has a named close button that cancels', () => {
        const { onCancel } = renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('saves and cancels from the footer buttons', () => {
        const { onCancel, onSave } = renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables saving while the picture uploads', () => {
        renderModal({ isUploadingPic: true });

        expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    });

    it('cancels on Escape', async () => {
        const user = userEvent.setup();
        const { onCancel } = renderModal();

        await user.keyboard('{Escape}');

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not discard the crop when the backdrop is clicked', () => {
        const { onCancel } = renderModal();

        fireEvent.click(document.querySelector('.crop-modal-overlay'));

        expect(onCancel).not.toHaveBeenCalled();
    });

    it('moves focus into the dialog and keeps Tab inside it', async () => {
        const user = userEvent.setup();
        renderModal();
        const close = screen.getByRole('button', { name: 'Close' });
        expect(close).toHaveFocus();

        await user.tab({ shift: true });
        expect(screen.getByRole('button', { name: 'Save Changes' })).toHaveFocus();
        await user.tab();
        expect(close).toHaveFocus();
    });

    it('returns focus to the control that opened it when it closes', () => {
        const opener = document.createElement('button');
        document.body.appendChild(opener);
        opener.focus();
        const { rerender, onCancel, onSave } = renderModal();
        expect(opener).not.toHaveFocus();

        rerender(<Modal isCropping={false} cropImgRef={React.createRef()} cropImage="" isUploadingPic={false} onCancel={onCancel} onSave={onSave} />);

        expect(opener).toHaveFocus();
        opener.remove();
    });
});
