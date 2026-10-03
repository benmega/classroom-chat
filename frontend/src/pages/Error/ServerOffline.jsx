import React, { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../store/useAuthStore';
import './ServerOffline.css';

const FUN_MESSAGES = [
  "🔌 Plugging in...",
  "🧹 Dusting off...",
  "☕ Making coffee...",
  "🔥 Warming up...",
  "📚 Loading DB...",
  "🎨 Painting bits...",
  "🧠 Pep talk...",
  "🚀 Initializing...",
  "✨ Final touches..."
];

const DEFAULT_WAKEUP_API_URL = 'https://e5fsaweh7l.execute-api.ap-southeast-1.amazonaws.com/server-start';
// Build-time override; the fallback keeps builds without VITE_WAKEUP_API_URL working.
const getWakeupUrl = () => import.meta.env.VITE_WAKEUP_API_URL || DEFAULT_WAKEUP_API_URL;
const WAKEUP_REQUEST_TIMEOUT_MS = 10000; // give up on a hung wake-up request
const TOTAL_TIME = 300; // 5 minutes

const ServerOffline = () => {
  const { checkAuth } = useAuthStore();
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const progressIntervalRef = useRef(null);
  const messageIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const wakeRequestRef = useRef(null);

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // The countdown ran out. If the server came up meanwhile, App swaps this page out on
  // its own; if it is still down, go back to the idle screen rather than reloading
  // into the same dead server.
  const handleCountdownDone = async () => {
    clearInterval(progressIntervalRef.current);
    clearInterval(messageIntervalRef.current);

    try {
      await checkAuth();
    } catch {
      // A failed check just means the server is not up yet.
    }
    if (!useAuthStore.getState().isServerOffline) return;

    clearInterval(pollIntervalRef.current);
    setIsWakingUp(false);
    setProgress(0);
    setTimeLeft(TOTAL_TIME);
    setCurrentMessageIndex(0);
    setErrorMsg('Still starting up - try again in a minute');
  };

  const handleWakeUp = async () => {
    setErrorMsg('');
    setIsWakingUp(true);

    const controller = new AbortController();
    wakeRequestRef.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, WAKEUP_REQUEST_TIMEOUT_MS);

    try {
      const resp = await fetch(getWakeupUrl(), { method: 'POST', mode: 'cors', signal: controller.signal });
      if (!resp.ok) throw new Error();
      
      startTimeRef.current = Date.now();
      
      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, TOTAL_TIME - Math.floor(elapsed));
        const pct = Math.min(100, (elapsed / TOTAL_TIME) * 100);
        
        setProgress(pct);
        setTimeLeft(remaining);

        if (pct >= 100) {
          handleCountdownDone();
        }
      }, 100);

      messageIntervalRef.current = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % FUN_MESSAGES.length);
      }, 6000);

      pollIntervalRef.current = setInterval(async () => {
        try {
          await checkAuth();
        } catch {
          // ignore error while polling
        }
      }, 8000);

    } catch (err) {
      // Aborted because the page went away: there is nothing left to update.
      if (controller.signal.aborted && !timedOut) return;
      console.error('Wake up error:', err);
      setIsWakingUp(false);
      setErrorMsg('Error waking server. Try again soon.');
    } finally {
      clearTimeout(timeout);
    }
  };

  useEffect(() => {
    return () => {
      if (wakeRequestRef.current) wakeRequestRef.current.abort();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return (
    <div className="server-offline-container">
      <div className="glass-panel server-offline-card">
        <img 
          src="/sleeping_duck.gif" 
          alt="Sleeping Duck" 
          className="server-offline-img"
        />

        {!isWakingUp ? (
          <div className="server-offline-box">
            <h1 className="server-offline-title">
              Classroom Chat is Sleeping
            </h1>
            <p className="server-offline-subtitle">
              Wake it up so students can chat and earn ducks!
            </p>
            <button 
              onClick={handleWakeUp}
              className="btn-premium server-offline-btn"
            >
              Wake Up the Classroom Chat
            </button>
            {errorMsg && (
              <div className="server-offline-error">
                {errorMsg}
              </div>
            )}
          </div>
        ) : (
          <div className="server-offline-waking-box">
            <div className="server-offline-rocket">
              🚀
            </div>

            <div className="server-offline-progress-container">
              <div 
                className="server-offline-progress-bar"
                style={{ width: `${progress}%` }} 
              />
            </div>

            <div className="server-offline-time">
              {formatTime(timeLeft)}
            </div>

            <div className="server-offline-status">
              Starting up...
            </div>

            <div className="server-offline-fun-msg">
              {FUN_MESSAGES[currentMessageIndex]}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerOffline;
