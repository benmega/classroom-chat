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

const WAKEUP_API_URL = 'https://e5fsaweh7l.execute-api.ap-southeast-1.amazonaws.com/server-start';
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

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWakeUp = async () => {
    setErrorMsg('');
    setIsWakingUp(true);

    try {
      const resp = await fetch(WAKEUP_API_URL, { method: 'POST', mode: 'cors' });
      if (!resp.ok) throw new Error();
      
      startTimeRef.current = Date.now();
      
      // 1. Progress Bar Interval
      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, TOTAL_TIME - Math.floor(elapsed));
        const pct = Math.min(100, (elapsed / TOTAL_TIME) * 100);
        
        setProgress(pct);
        setTimeLeft(remaining);

        if (pct >= 100) {
          clearInterval(progressIntervalRef.current);
          window.location.reload();
        }
      }, 100);

      // 2. Fun Messages Switcher
      messageIntervalRef.current = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % FUN_MESSAGES.length);
      }, 6000);

      // 3. Backend Polling (Check if server is awake early!)
      pollIntervalRef.current = setInterval(async () => {
        try {
          // Check auth status directly. If it succeeds, the store updates isServerOffline to false.
          await checkAuth();
        } catch {
          // Keep polling if it fails
        }
      }, 8000);

    } catch (err) {
      console.error('Wake up error:', err);
      setIsWakingUp(false);
      setErrorMsg('Error waking server. Try again soon.');
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
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
