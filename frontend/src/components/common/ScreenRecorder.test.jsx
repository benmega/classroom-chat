import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
