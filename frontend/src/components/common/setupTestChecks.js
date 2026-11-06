// Checks behind the camera + mic test in SetupTestRecorder.

export const TEST_DURATION_MS = 5000;
// Average luma (0-255) below this means the lens is covered, the privacy shutter is closed or the room is too dark.
export const DARK_FRAME_THRESHOLD = 25;
// Peak RMS (0-1) below this means nothing louder than background hiss reached the microphone.
export const SILENT_AUDIO_THRESHOLD = 0.02;

// pixels: RGBA bytes from getImageData
export const averageBrightness = (pixels) => {
  const count = pixels.length / 4;
  if (!count) return 0;
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    total += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }
  return total / count;
};

// samples: bytes from AnalyserNode.getByteTimeDomainData, where 128 is silence
export const rmsLevel = (samples) => {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / samples.length);
};

// brightness and peakLevel are null when the browser gave us no way to measure them
export const evaluateTest = ({ micRequested, hasVideo, hasAudio, brightness, peakLevel }) => {
  let camera;
  if (!hasVideo) {
    camera = { ok: false, message: 'No camera picture came through. Check that your camera is plugged in and that the browser is allowed to use it.' };
  } else if (brightness !== null && brightness < DARK_FRAME_THRESHOLD) {
    camera = { ok: false, message: 'Your camera picture is almost black. Is something covering the camera, or is its privacy shutter closed? Is your room too dark?' };
  } else {
    camera = { ok: true, message: 'Your camera picture came through. Check the playback to make sure you are in the frame.' };
  }

  let microphone;
  if (!micRequested) {
    microphone = { ok: false, message: 'The microphone is switched off in the recorder settings, so your recording will have no sound. Turn it on if you want to talk.' };
  } else if (!hasAudio) {
    microphone = { ok: false, message: 'No microphone sound came through. Check that your microphone is plugged in and that the browser is allowed to use it.' };
  } else if (peakLevel !== null && peakLevel < SILENT_AUDIO_THRESHOLD) {
    microphone = { ok: false, message: 'We could not hear you. Is your microphone muted or turned all the way down? Talk out loud during the test.' };
  } else {
    microphone = { ok: true, message: 'Your microphone picked up sound. Play the clip back to check you can hear yourself.' };
  }

  return { camera, microphone };
};

export const describeMediaError = (error) => {
  switch (error && error.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'The browser is not allowed to use your camera or microphone. Click the camera icon in the address bar, choose Allow, then test again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera or microphone was found. Plug one in, then test again.';
    case 'NotReadableError':
    case 'AbortError':
      return 'Your camera or microphone is busy. Close other apps that might be using it (like Zoom, Teams or another browser tab), then test again.';
    default:
      return `Could not start your camera or microphone${error && error.message ? `: ${error.message}` : '.'}`;
  }
};
