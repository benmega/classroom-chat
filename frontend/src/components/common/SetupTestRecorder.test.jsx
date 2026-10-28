import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SetupTestRecorder from './SetupTestRecorder';
import {
    averageBrightness,
    rmsLevel,
    evaluateTest,
    describeMediaError,
    DARK_FRAME_THRESHOLD,
    SILENT_AUDIO_THRESHOLD,
} from './setupTestChecks';
import ScreenRecorder from './ScreenRecorder';

const pixelsOf = (value, count = 4) => new Uint8ClampedArray(Array(count).fill([value, value, value, 255]).flat());

describe('averageBrightness', () => {
    it('reads a black frame as 0 and a white frame as 255', () => {
        expect(averageBrightness(pixelsOf(0))).toBe(0);
        expect(averageBrightness(pixelsOf(255))).toBeCloseTo(255);
    });

    it('treats an empty frame as dark', () => {
        expect(averageBrightness(new Uint8ClampedArray(0))).toBe(0);
    });
});

describe('rmsLevel', () => {
    it('reads the analyser midpoint as silence', () => {
        expect(rmsLevel(new Uint8Array(64).fill(128))).toBe(0);
    });

    it('rises with the signal', () => {
        const quiet = Uint8Array.from({ length: 64 }, (_, i) => (i % 2 ? 130 : 126));
        const loud = Uint8Array.from({ length: 64 }, (_, i) => (i % 2 ? 200 : 56));
        expect(rmsLevel(quiet)).toBeLessThan(SILENT_AUDIO_THRESHOLD);
        expect(rmsLevel(loud)).toBeGreaterThan(SILENT_AUDIO_THRESHOLD);
    });
});

describe('evaluateTest', () => {
    const good = { micRequested: true, hasVideo: true, hasAudio: true, brightness: 120, peakLevel: 0.2 };

    it('passes a lit camera and an audible microphone', () => {
        const { camera, microphone } = evaluateTest(good);
        expect(camera.ok).toBe(true);
        expect(microphone.ok).toBe(true);
    });

    it('flags a covered camera', () => {
        const { camera } = evaluateTest({ ...good, brightness: DARK_FRAME_THRESHOLD - 1 });
        expect(camera.ok).toBe(false);
        expect(camera.message).toMatch(/covering the camera/);
    });

    it('flags a missing camera', () => {
        expect(evaluateTest({ ...good, hasVideo: false }).camera.ok).toBe(false);
    });

    it('flags a silent microphone', () => {
        const { microphone } = evaluateTest({ ...good, peakLevel: 0.001 });
        expect(microphone.ok).toBe(false);
        expect(microphone.message).toMatch(/muted/);
    });

    it('flags the microphone switched off in the recorder settings', () => {
        const { microphone } = evaluateTest({ ...good, micRequested: false, hasAudio: false, peakLevel: null });
        expect(microphone.ok).toBe(false);
        expect(microphone.message).toMatch(/switched off in the recorder settings/);
    });

    it('does not fail what the browser could not measure', () => {
        const { camera, microphone } = evaluateTest({ ...good, brightness: null, peakLevel: null });
        expect(camera.ok).toBe(true);
        expect(microphone.ok).toBe(true);
    });
});

describe('describeMediaError', () => {
    it('explains a blocked permission', () => {
        expect(describeMediaError({ name: 'NotAllowedError' })).toMatch(/Allow/);
    });

    it('explains a device held by another app', () => {
        expect(describeMediaError({ name: 'NotReadableError' })).toMatch(/busy/);
    });
});

const makeTrack = (kind) => ({ kind, readyState: 'live', stop: vi.fn() });

class FakeMediaRecorder {
    static isTypeSupported() { return true; }
    constructor(stream) {
        this.stream = stream;
        this.state = 'inactive';
        FakeMediaRecorder.instances.push(this);
    }
    start() { this.state = 'recording'; }
    stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['clip'], { type: 'video/webm' }) });
        this.onstop?.();
    }
}
FakeMediaRecorder.instances = [];

describe('SetupTestRecorder', () => {
    let tracks;

    beforeEach(() => {
        tracks = [makeTrack('video'), makeTrack('audio')];
        const stream = {
            getTracks: () => tracks,
            getVideoTracks: () => tracks.filter(t => t.kind === 'video'),
            getAudioTracks: () => tracks.filter(t => t.kind === 'audio'),
        };
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
        });
        vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
        FakeMediaRecorder.instances = [];
        window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-clip');
        window.URL.revokeObjectURL = vi.fn();
        vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
        // happy-dom only accepts a real MediaStream here
        vi.spyOn(HTMLMediaElement.prototype, 'srcObject', 'set').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        delete navigator.mediaDevices;
    });

    it('asks for the same camera and microphone the real recording uses', async () => {
        render(<SetupTestRecorder includeMicrophone onBack={vi.fn()} durationMs={50} />);
        await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            video: { width: 640, height: 480 },
            audio: true,
        }));
    });

    it('plays the clip back locally, shows results and releases the devices', async () => {
        render(<SetupTestRecorder includeMicrophone onBack={vi.fn()} durationMs={50} />);

        const playback = await screen.findByLabelText('Test clip playback');
        expect(playback).toHaveAttribute('src', 'blob:test-clip');
        expect(screen.getByRole('list', { name: 'Test results' })).toHaveTextContent('Camera');
        expect(screen.getByRole('list', { name: 'Test results' })).toHaveTextContent('Microphone');
        tracks.forEach(t => expect(t.stop).toHaveBeenCalled());
    });

    it('reports a mic that is off in the settings', async () => {
        tracks = [makeTrack('video')];
        render(<SetupTestRecorder includeMicrophone={false} onBack={vi.fn()} durationMs={50} />);

        expect(await screen.findByText(/switched off in the recorder settings/)).toBeInTheDocument();
    });

    it('explains a blocked camera and lets the student try again', async () => {
        navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
        render(<SetupTestRecorder includeMicrophone onBack={vi.fn()} durationMs={50} />);

        expect(await screen.findByRole('alert')).toHaveTextContent(/not allowed/);

        fireEvent.click(screen.getByRole('button', { name: /Test Again/ }));
        expect(await screen.findByLabelText('Test clip playback')).toBeInTheDocument();
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
    });

    it('stops the camera when the student leaves mid-test', async () => {
        const { unmount } = render(<SetupTestRecorder includeMicrophone onBack={vi.fn()} durationMs={60000} />);
        await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));

        unmount();

        tracks.forEach(t => expect(t.stop).toHaveBeenCalled());
        expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('never hands the test clip to the project upload', async () => {
        const onRecordingComplete = vi.fn();
        render(<ScreenRecorder isOpen onClose={vi.fn()} onRecordingComplete={onRecordingComplete} />);

        fireEvent.click(screen.getByRole('button', { name: /Test camera \+ mic first/ }));
        expect(screen.getByRole('heading', { name: 'Test Camera + Mic' })).toBeInTheDocument();
        await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));
        act(() => FakeMediaRecorder.instances[0].stop());
        expect(await screen.findByLabelText('Test clip playback')).toBeInTheDocument();
        expect(onRecordingComplete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /Back to Setup/ }));
        expect(screen.getByRole('heading', { name: 'Screen + Camera Setup' })).toBeInTheDocument();
    });
});
