import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ScreenRecorder from './ScreenRecorder';

const renderRecorder = () => render(
    <ScreenRecorder isOpen onClose={vi.fn()} onRecordingComplete={vi.fn()} />
);

describe('ScreenRecorder setup controls', () => {
    it('names the quality slider and reads its value as a quality name, not an index', () => {
        renderRecorder();
        const slider = screen.getByRole('slider', { name: 'Recording quality' });

        expect(slider).toHaveAttribute('aria-valuetext', '720p');

        fireEvent.change(slider, { target: { value: '3' } });
        expect(slider).toHaveAttribute('aria-valuetext', '1440p');
    });

    it('names the camera size slider and reads its value as a percentage', () => {
        renderRecorder();
        const slider = screen.getByRole('slider', { name: 'Camera overlay size' });

        expect(slider).toHaveAttribute('aria-valuetext', '40%');

        fireEvent.change(slider, { target: { value: '55' } });
        expect(slider).toHaveAttribute('aria-valuetext', '55%');
    });

    it('names the microphone switch and keeps its state', () => {
        renderRecorder();
        const mic = screen.getByRole('switch', { name: 'Microphone' });

        expect(mic).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(mic);
        expect(mic).toHaveAttribute('aria-checked', 'false');
    });

    it('lets the keyboard flip the microphone switch', () => {
        renderRecorder();
        const mic = screen.getByRole('switch', { name: 'Microphone' });

        fireEvent.keyDown(mic, { key: ' ' });

        expect(mic).toHaveAttribute('aria-checked', 'false');
    });
});

describe('ScreenRecorder page scroll lock', () => {
    afterEach(() => {
        document.body.style.overflow = '';
    });

    // Inside the signed-in shell a stylesheet rule already computes body to hidden. Restoring that computed
    // value as an inline style would leave every later page (sign-in, landing) unable to scroll.
    it('leaves no inline overflow behind when a stylesheet already hides the body', () => {
        const sheet = document.createElement('style');
        sheet.textContent = 'body { overflow: hidden; }';
        document.head.appendChild(sheet);
        try {
            expect(window.getComputedStyle(document.body).overflow).toBe('hidden');
            const { unmount } = renderRecorder();
            expect(document.body.style.overflow).toBe('hidden');

            unmount();

            expect(document.body.style.overflow).toBe('');
        } finally {
            sheet.remove();
        }
    });

    it('restores an inline overflow that was set before it opened', () => {
        document.body.style.overflow = 'auto';
        const { unmount } = renderRecorder();
        expect(document.body.style.overflow).toBe('hidden');

        unmount();

        expect(document.body.style.overflow).toBe('auto');
    });
});
