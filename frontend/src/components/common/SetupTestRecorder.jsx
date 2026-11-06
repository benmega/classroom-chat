import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Mic, MicOff, RotateCcw, ArrowLeft } from 'lucide-react';
import { TEST_DURATION_MS, averageBrightness, rmsLevel, evaluateTest, describeMediaError } from './setupTestChecks';

// A short practice clip of the camera and microphone, so a student finds a covered lens or a muted mic
// before the real recording. The clip only ever lives in a local blob URL: it is never handed to
// onRecordingComplete, so it is never uploaded to S3 and never reaches YouTube.

const SAMPLE_INTERVAL_MS = 100;
const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 24;

const pickMimeType = () => {
  const types = ['video/webm; codecs=vp9,opus', 'video/webm; codecs=vp8,opus', 'video/webm'];
  return types.find(t => MediaRecorder.isTypeSupported(t));
};

const isLive = (tracks) => tracks.some(t => t.readyState !== 'ended');

const SetupTestRecorder = ({ includeMicrophone, onBack, durationMs = TEST_DURATION_MS }) => {
  const [phase, setPhase] = useState('starting'); // 'starting' | 'recording' | 'review' | 'error'
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const liveVideoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    let audioContext = null;
    let recorder = null;
    let sampleTimer = null;
    let countdownTimer = null;
    let stopTimer = null;

    const release = () => {
      clearInterval(sampleTimer);
      clearInterval(countdownTimer);
      clearTimeout(stopTimer);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioContext) audioContext.close().catch(() => {});
      if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
    };

    const fail = (e) => {
      console.warn('Camera test failed', e);
      release();
      if (cancelled) return;
      setError(describeMediaError(e));
      setPhase('error');
    };

    const run = async () => {
      try {
        // The same request the real recorder makes, so a pass here means the real recording gets the same devices
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: includeMicrophone });
      } catch (e) {
        fail(e);
        return;
      }
      if (cancelled) {
        release();
        return;
      }

      try {
        const video = liveVideoRef.current;
        video.srcObject = stream;
        video.muted = true;
        await video.play().catch(() => {});

        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_WIDTH;
        canvas.height = SAMPLE_HEIGHT;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        let analyser = null;
        let samples = null;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (stream.getAudioTracks().length > 0 && AudioCtx) {
          audioContext = new AudioCtx();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 1024;
          audioContext.createMediaStreamSource(stream).connect(analyser);
          samples = new Uint8Array(analyser.fftSize);
        }

        const brightnessSamples = [];
        let peakLevel = 0;
        sampleTimer = setInterval(() => {
          if (ctx && video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
            brightnessSamples.push(averageBrightness(ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data));
          }
          if (analyser) {
            analyser.getByteTimeDomainData(samples);
            const current = rmsLevel(samples);
            peakLevel = Math.max(peakLevel, current);
            setLevel(current);
          }
        }, SAMPLE_INTERVAL_MS);

        const mimeType = pickMimeType();
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks = [];
        recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          const evaluation = evaluateTest({
            micRequested: includeMicrophone,
            hasVideo: isLive(stream.getVideoTracks()),
            hasAudio: isLive(stream.getAudioTracks()),
            brightness: brightnessSamples.length
              ? brightnessSamples.reduce((a, b) => a + b, 0) / brightnessSamples.length
              : null,
            peakLevel: analyser ? peakLevel : null,
          });
          release();
          if (cancelled) return;
          if (chunks.length > 0) {
            setPlaybackUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })));
          }
          setResult(evaluation);
          setPhase('review');
        };
        recorder.start();
        setPhase('recording');

        let remaining = Math.ceil(durationMs / 1000);
        setSecondsLeft(remaining);
        countdownTimer = setInterval(() => {
          remaining = Math.max(remaining - 1, 0);
          setSecondsLeft(remaining);
        }, 1000);
        stopTimer = setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, durationMs);
      } catch (e) {
        fail(e);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      release();
    };
  }, [includeMicrophone, durationMs, attempt]);

  useEffect(() => () => {
    if (playbackUrl) URL.revokeObjectURL(playbackUrl);
  }, [playbackUrl]);

  const handleTestAgain = () => {
    setPlaybackUrl(null);
    setResult(null);
    setError('');
    setLevel(0);
    setPhase('starting');
    setAttempt(a => a + 1);
  };

  const isLiveView = phase === 'starting' || phase === 'recording';
  const levelPercent = Math.min(100, Math.round((level / 0.3) * 100));

  return (
    <div className="screen-recorder-page setup-test">
      <p className="setup-test-note">
        This test clip stays on your computer. It is not saved to your project or posted to YouTube.
      </p>

      <div className={`video-container${isLiveView ? '' : ' hidden'}`}>
        <video ref={liveVideoRef} autoPlay muted playsInline aria-label="Live camera preview"></video>
        <div className="video-label">
          {phase === 'starting' ? 'Starting camera...' : `Testing... ${secondsLeft}s`}
        </div>
      </div>

      {isLiveView && (
        <>
          <p className="setup-test-hint">
            {includeMicrophone
              ? 'Look at the camera and say your name out loud.'
              : 'Look at the camera. The microphone is switched off, so only your camera is being tested.'}
          </p>
          {includeMicrophone && (
            <div
              className="setup-test-meter"
              role="meter"
              aria-label="Microphone level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={levelPercent}
            >
              <Mic size={20} aria-hidden="true" />
              <div className="setup-test-meter-track">
                <div className="setup-test-meter-fill" style={{ width: `${levelPercent}%` }}></div>
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'review' && result && (
        <>
          {playbackUrl && (
            <div className="video-container">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the student's own few-second practice clip, never published */}
              <video src={playbackUrl} controls playsInline aria-label="Test clip playback"></video>
            </div>
          )}
          <ul className="setup-test-results" aria-label="Test results">
            <li className={result.camera.ok ? 'is-ok' : 'is-problem'}>
              {result.camera.ok ? <Camera size={22} aria-hidden="true" /> : <CameraOff size={22} aria-hidden="true" />}
              <span><strong>Camera: {result.camera.ok ? 'OK' : 'Check this'}.</strong> {result.camera.message}</span>
            </li>
            <li className={result.microphone.ok ? 'is-ok' : 'is-problem'}>
              {result.microphone.ok ? <Mic size={22} aria-hidden="true" /> : <MicOff size={22} aria-hidden="true" />}
              <span><strong>Microphone: {result.microphone.ok ? 'OK' : 'Check this'}.</strong> {result.microphone.message}</span>
            </li>
          </ul>
        </>
      )}

      {phase === 'error' && (
        <p className="setup-test-error" role="alert">{error}</p>
      )}

      <div className="recording-controls">
        {(phase === 'review' || phase === 'error') && (
          <button type="button" onClick={handleTestAgain} className="screen-recorder-btn screen-recorder-btn-secondary">
            <RotateCcw size={18} /> Test Again
          </button>
        )}
        <button type="button" onClick={onBack} className="screen-recorder-btn screen-recorder-btn-secondary">
          <ArrowLeft size={18} /> Back to Setup
        </button>
      </div>
    </div>
  );
};

export default SetupTestRecorder;
