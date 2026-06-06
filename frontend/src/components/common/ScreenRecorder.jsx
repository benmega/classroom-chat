import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mic, MicOff, Settings, Monitor, Play, Pause, Square } from 'lucide-react';
import './ScreenRecorder.css';

class ScreenRecorderCore {
  constructor(settings, onStatusChange, onTimerUpdate) {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.animationFrameId = null;
    this.screenStream = null;
    this.camStream = null;
    this.canvas = null;
    this.ctx = null;
    this.canvasStream = null;
    this.combinedStream = null;
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.timerInterval = null;
    this.settings = settings;
    this.onStatusChange = onStatusChange;
    this.onTimerUpdate = onTimerUpdate;
    this.screenVideo = null;
    this.camVideo = null;
  }

  getQualityConstraints() {
    const constraints = { '480p': { width:854,height:480 }, '720p': { width:1280,height:720 }, '1080p':{ width:1920,height:1080 }, '1440p':{ width:2560,height:1440 } };
    return constraints[this.settings.quality] || constraints['720p'];
  }

  getOverlaySize(canvasHeight) {
    const pct = this.settings.overlaySize || 40;
    return Math.floor(canvasHeight * (pct / 100));
  }

  getOverlayPosition(canvasWidth, canvasHeight, size) {
    const margin = 20;
    const positions = {
      'bottom-left': {x:margin, y:canvasHeight-size-margin},
      'bottom-right': {x:canvasWidth-size-margin, y:canvasHeight-size-margin},
      'top-left': {x:margin, y:margin},
      'top-right': {x:canvasWidth-size-margin, y:margin}
    };
    return positions[this.settings.overlayPosition] || positions['bottom-left'];
  }

  drawOverlay(camVideo, x, y, size) {
    if (!this.ctx) return;
    this.ctx.save();
    switch(this.settings.overlayShape){
      case 'circle': this.ctx.beginPath(); this.ctx.arc(x+size/2, y+size/2, size/2,0,Math.PI*2); this.ctx.closePath(); this.ctx.clip(); break;
      case 'rectangle': this.ctx.beginPath(); this.ctx.rect(x,y,size,size); this.ctx.clip(); break;
      case 'rounded': this.ctx.beginPath(); this.ctx.roundRect(x,y,size,size,15); this.ctx.clip(); break;
    }
    this.ctx.drawImage(camVideo,x,y,size,size);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle='rgba(255,255,255,0.8)'; this.ctx.lineWidth=3;
    switch(this.settings.overlayShape){
      case 'circle': this.ctx.beginPath(); this.ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2); this.ctx.stroke(); break;
      case 'rectangle': this.ctx.strokeRect(x,y,size,size); break;
      case 'rounded': this.ctx.beginPath(); this.ctx.roundRect(x,y,size,size,15); this.ctx.stroke(); break;
    }
    this.ctx.restore();
  }

  startTimer() {
    this.startTime = Date.now()-this.pausedTime;
    this.timerInterval = setInterval(() => {
      if(!this.isPaused){
        const elapsed = Math.floor((Date.now()-this.startTime)/1000);
        const min = Math.floor(elapsed/60).toString().padStart(2,'0');
        const sec = (elapsed%60).toString().padStart(2,'0');
        if (this.onTimerUpdate) this.onTimerUpdate(`${min}:${sec}`);
      }
    },1000);
  }

  stopTimer() { 
    if(this.timerInterval){ clearInterval(this.timerInterval); this.timerInterval=null; } 
    this.startTime=null; 
    this.pausedTime=0; 
    if (this.onTimerUpdate) this.onTimerUpdate('00:00'); 
  }

  async begin(previewElement) {
    try {
      if (this.onStatusChange) this.onStatusChange('Initializing...');
      const qualityConstraints = this.getQualityConstraints();
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { ...qualityConstraints, frameRate: 30 }, audio: false });
      
      try {
        this.camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: this.settings.includeMicrophone });
      } catch (e) {
        console.warn("Could not get camera/mic stream", e);
        // Fallback or handle failure
      }

      this.screenVideo = document.createElement('video');
      this.screenVideo.srcObject = this.screenStream;
      this.screenVideo.muted = true;
      this.screenVideo.playsInline = true;
      await this.screenVideo.play();
      
      if (this.camStream) {
        this.camVideo = document.createElement('video');
        this.camVideo.srcObject = this.camStream;
        this.camVideo.muted = true;
        this.camVideo.volume = 0;
        this.camVideo.playsInline = true;
        await this.camVideo.play();
      }

      this.canvas = document.createElement('canvas');
      const settings = this.screenStream.getVideoTracks()[0].getSettings();
      this.canvas.width = settings.width || qualityConstraints.width;
      this.canvas.height = settings.height || qualityConstraints.height;
      this.ctx = this.canvas.getContext('2d');

      if (previewElement) {
        const previewStream = new MediaStream(this.canvas.captureStream(30).getVideoTracks());
        previewElement.srcObject = previewStream;
        previewElement.muted = true;
        previewElement.volume = 0;
      }

      this.isRecording = true;

      const draw = () => {
        if (!this.isRecording) return;
        this.ctx.drawImage(this.screenVideo, 0, 0, this.canvas.width, this.canvas.height);
        
        if (this.camVideo) {
          const size = this.getOverlaySize(this.canvas.height);
          const pos = this.getOverlayPosition(this.canvas.width, this.canvas.height, size);
          this.drawOverlay(this.camVideo, pos.x, pos.y, size);
        }
        
        this.animationFrameId = setTimeout(draw, 1000 / 30);
      };
      
      if (this.screenVideo.readyState >= 2) {
        draw();
      } else {
        this.screenVideo.onplay = draw;
      }

      this.canvasStream = this.canvas.captureStream(30);
      const tracks = [...this.canvasStream.getVideoTracks()];
      if (this.settings.includeMicrophone && this.camStream && this.camStream.getAudioTracks().length > 0) {
        tracks.push(...this.camStream.getAudioTracks());
      }
      this.combinedStream = new MediaStream(tracks);

      let options = MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus') ?
        { mimeType: 'video/webm; codecs=vp9,opus', videoBitsPerSecond: 1000000 } :
        MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus') ?
        { mimeType: 'video/webm; codecs=vp8,opus', videoBitsPerSecond: 1000000 } :
        MediaRecorder.isTypeSupported('video/webm') ?
        { mimeType: 'video/webm', videoBitsPerSecond: 1000000 } :
        { videoBitsPerSecond: 1000000 };

      this.mediaRecorder = new MediaRecorder(this.combinedStream, options);
      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
      
      // Return a promise that resolves with the blob when recording stops
      return new Promise((resolve) => {
        this.mediaRecorder.onstop = () => {
          this.cleanup();
          if (this.recordedChunks.length === 0) {
            if (this.onStatusChange) this.onStatusChange('Recording Error: No data');
            resolve(null);
            return;
          }
          const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
          resolve(blob);
        };
        this.mediaRecorder.start(1000);
        this.startTimer();
        if (this.onStatusChange) this.onStatusChange('Recording');
      });

    } catch (e) {
      console.error(e); 
      if (this.onStatusChange) this.onStatusChange('Error: ' + e.message); 
      this.cleanup();
      return null;
    }
  }

  stopRecording() { 
    if(this.mediaRecorder && this.isRecording){ 
      this.mediaRecorder.stop(); 
      this.isRecording=false; 
      this.stopTimer(); 
      if (this.onStatusChange) this.onStatusChange('Processing...'); 
    } 
  }

  togglePause() {
    if(!this.mediaRecorder || !this.isRecording) return;
    if(this.isPaused){ 
      this.mediaRecorder.resume(); 
      this.isPaused=false; 
      this.startTime=Date.now()-this.pausedTime; 
      if (this.onStatusChange) this.onStatusChange('Recording'); 
    } else { 
      this.mediaRecorder.pause(); 
      this.isPaused=true; 
      this.pausedTime=Date.now()-this.startTime; 
      if (this.onStatusChange) this.onStatusChange('Paused'); 
    }
  }

  cleanup() {
    if (this.animationFrameId) { clearTimeout(this.animationFrameId); this.animationFrameId = null; }
    if (this.screenStream) this.screenStream.getTracks().forEach(t => t.stop()); this.screenStream = null;
    if (this.camStream) this.camStream.getTracks().forEach(t => t.stop()); this.camStream = null;
    if (this.screenVideo) { this.screenVideo.pause(); this.screenVideo.srcObject = null; }
    if (this.camVideo) { this.camVideo.pause(); this.camVideo.srcObject = null; }
    this.isRecording = false; this.isPaused = false; this.mediaRecorder = null; this.canvas = null; this.ctx = null; this.canvasStream = null; this.combinedStream = null;
  }
}


const ScreenRecorder = ({ isOpen, onClose, onRecordingComplete }) => {
  const [stage, setStage] = useState('setup'); // 'setup' | 'recording'
  const [settings, setSettings] = useState({
    overlayPosition: 'bottom-left',
    overlaySize: 40,
    overlayShape: 'circle',
    quality: '720p',
    includeMicrophone: true
  });
  const [status, setStatus] = useState('');
  const [timer, setTimer] = useState('00:00');
  const [isPaused, setIsPaused] = useState(false);
  
  const recorderRef = useRef(null);
  const previewVideoRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (recorderRef.current) {
        recorderRef.current.cleanup();
        recorderRef.current = null;
      }
      setTimeout(() => setStage('setup'), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    setStage('recording');
    recorderRef.current = new ScreenRecorderCore(settings, setStatus, setTimer);
    
    // We need to wait for the next render for previewVideoRef to be available
    setTimeout(async () => {
      const blob = await recorderRef.current.begin(previewVideoRef.current);
      if (blob) {
        onRecordingComplete(blob);
      }
    }, 100);
  };

  const handleStopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording();
    }
  };

  const handleTogglePause = () => {
    if (recorderRef.current) {
      recorderRef.current.togglePause();
      setIsPaused(recorderRef.current.isPaused);
    }
  };

  const shapes = ['circle', 'rectangle', 'rounded'];
  const handleShapeClick = () => {
    const nextIndex = (shapes.indexOf(settings.overlayShape) + 1) % shapes.length;
    setSettings({ ...settings, overlayShape: shapes[nextIndex] });
  };

  const qMap = ['480p', '720p', '1080p', '1440p'];
  const qIndex = qMap.indexOf(settings.quality);

  const getCameraStyle = () => {
    const style = {
      height: `${settings.overlaySize}%`,
      top: 'auto', bottom: 'auto', left: 'auto', right: 'auto'
    };
    
    if (settings.overlayShape === 'circle') style.borderRadius = '50%';
    else if (settings.overlayShape === 'rounded') style.borderRadius = '25%';
    else style.borderRadius = '0';
    
    const margin = '5%';
    if (settings.overlayPosition.includes('top')) style.top = margin;
    else style.bottom = margin;
    
    if (settings.overlayPosition.includes('left')) style.left = margin;
    else style.right = margin;
    
    return style;
  };

  const modalContent = (
    <div className="screen-recorder-modal-overlay">
      <div className="screen-recorder-modal">
        <header>
          <h1>{stage === 'setup' ? 'Screen + Camera Setup' : status || 'Recording...'}</h1>
          <button className="screen-recorder-close-btn" onClick={onClose}><X size={32} /></button>
        </header>

        {stage === 'setup' ? (
          <div className="screen-recorder-page">
            <div className="hud-container">
              <div className="layout-preview">
                <div className="corner-target top-left" onClick={() => setSettings({...settings, overlayPosition: 'top-left'})}></div>
                <div className="corner-target top-right" onClick={() => setSettings({...settings, overlayPosition: 'top-right'})}></div>
                <div className="corner-target bottom-left" onClick={() => setSettings({...settings, overlayPosition: 'bottom-left'})}></div>
                <div className="corner-target bottom-right" onClick={() => setSettings({...settings, overlayPosition: 'bottom-right'})}></div>
                
                <div 
                  className="preview-camera" 
                  style={getCameraStyle()} 
                  onClick={handleShapeClick} 
                  title="Click to change shape"
                ></div>
              </div>

              <div className="controls-under">
                <div className="control-row">
                  <div className="hud-control flex-grow">
                    <label>📺 <span className="val-label">{settings.quality}</span></label>
                    <input 
                      type="range" 
                      min="0" max="3" step="1" 
                      value={qIndex >= 0 ? qIndex : 1}
                      onChange={(e) => setSettings({...settings, quality: qMap[e.target.value]})}
                    />
                  </div>
                  <div className="hud-control flex-grow">
                    <label>📏 <span className="val-label">{settings.overlaySize}%</span></label>
                    <input 
                      type="range" 
                      min="25" max="60" step="1" 
                      value={settings.overlaySize}
                      onChange={(e) => setSettings({...settings, overlaySize: parseInt(e.target.value, 10)})}
                    />
                  </div>
                  <div 
                    className="hud-control" 
                    title="Toggle Microphone" 
                    style={{cursor: 'pointer', justifyContent: 'center'}}
                    onClick={() => setSettings({...settings, includeMicrophone: !settings.includeMicrophone})}
                  >
                    {settings.includeMicrophone ? <Mic size={24} color="#334155" /> : <MicOff size={24} color="#ef4444" />}
                  </div>
                </div>
              </div>
              
              <button onClick={handleStartRecording} className="btn-record">RECORD</button>
            </div>
          </div>
        ) : (
          <div className="screen-recorder-page">
            <div className="video-container">
              <video ref={previewVideoRef} autoPlay muted playsInline></video>
              <div className="video-label">Time: {timer}</div>
            </div>
            <div className="recording-controls">
              <button onClick={handleTogglePause} className="screen-recorder-btn screen-recorder-btn-secondary">
                {isPaused ? <Play size={18} /> : <Pause size={18} />} {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button onClick={handleStopRecording} className="screen-recorder-btn screen-recorder-btn-secondary" style={{background: '#ef4444', borderColor: '#b91c1c'}}>
                <Square size={18} /> Stop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default ScreenRecorder;
