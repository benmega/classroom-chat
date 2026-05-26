import React, { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      backgroundColor: 'var(--bg-secondary)',
      backgroundImage: 'var(--gradient-mesh)',
      fontFamily: 'var(--font-body)',
      textAlign: 'center',
    }}>
      <div 
        className="glass-panel" 
        style={{
          maxWidth: '580px',
          width: '100%',
          padding: '3rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-rich)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <img 
          src="/sleeping_duck.gif" 
          alt="Sleeping Duck" 
          style={{
            width: '200px',
            height: 'auto',
            marginBottom: '1.5rem',
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.12))',
          }}
        />

        {!isWakingUp ? (
          <div style={{ width: '100%' }}>
            <h1 style={{
              fontSize: '2.5rem',
              color: 'var(--primary-color)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}>
              Classroom Chat is Sleeping
            </h1>
            <p style={{
              fontSize: '1.2rem',
              color: 'var(--text-secondary)',
              marginBottom: '2.5rem',
              opacity: 0.85,
            }}>
              Wake it up so students can chat and earn ducks!
            </p>
            <button 
              onClick={handleWakeUp}
              className="btn-premium"
              style={{
                width: '100%',
                maxWidth: '400px',
                fontSize: '1.25rem',
                padding: '16px 32px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Wake Up the Classroom Chat
            </button>
            {errorMsg && (
              <div style={{
                marginTop: '1.5rem',
                color: 'var(--error-color)',
                fontWeight: 600,
                fontSize: '1.1rem',
              }}>
                {errorMsg}
              </div>
            )}
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              fontSize: '4.5rem',
              marginBottom: '1.5rem',
              animation: 'bounce 1s infinite',
            }}>
              🚀
            </div>

            <div style={{
              width: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.06)',
              borderRadius: 'var(--radius-full)',
              height: '32px',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)',
              marginBottom: '1.5rem',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--primary-color))',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite, widthTransition 0.3s ease',
              }} />
            </div>

            <div style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              color: 'var(--secondary-color)',
              fontFamily: 'var(--font-heading)',
              marginBottom: '0.75rem',
            }}>
              {formatTime(timeLeft)}
            </div>

            <div style={{
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              opacity: 0.85,
              marginBottom: '1.25rem',
            }}>
              Starting up...
            </div>

            <div style={{
              fontSize: '1.25rem',
              fontStyle: 'italic',
              fontWeight: 600,
              color: 'var(--primary-color)',
              minHeight: '32px',
            }}>
              {FUN_MESSAGES[currentMessageIndex]}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default ServerOffline;
