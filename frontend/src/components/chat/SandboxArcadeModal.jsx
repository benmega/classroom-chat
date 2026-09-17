import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Play, 
  ExternalLink, 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  Star, 
  Lock, 
  Gamepad2, 
  Sparkles,
  Trophy
} from 'lucide-react';
import client from '../../api/client';
import './SandboxArcadeModal.css';

const SandboxArcadeModal = ({ isOpen, onClose, classId }) => {
  const [games, setGames] = useState([]);
  const [highestMilestone, setHighestMilestone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerContainerRef = useRef(null);

  // Trigger confetti and fetch games when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveGame(null);
      setIsFullscreen(false);

      // Launch celebratory confetti burst
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          zIndex: 99999,
        });
      } catch (err) {
        console.error('Confetti trigger failed:', err);
      }

      if (classId) {
        fetchGames();
      }
    }
  }, [isOpen, classId]);

  const fetchGames = async () => {
    if (!classId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.get(`/api/student/classrooms/${classId}/sandbox-games`);
      if (res.data) {
        setGames(res.data.games || []);
        setHighestMilestone(res.data.highest_milestone || '');
      }
    } catch (err) {
      console.error('Failed to load sandbox games:', err);
      setError('Unable to load sandbox games right now.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (activeGame) {
          setActiveGame(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeGame, isFullscreen, onClose]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (playerContainerRef.current?.requestFullscreen) {
        playerContainerRef.current.requestFullscreen().catch(() => {
          // Fallback to CSS fullscreen
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`sandbox-arcade-overlay ${isFullscreen ? 'fullscreen-mode' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !activeGame) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="arcade-modal-title"
    >
      <div 
        className={`sandbox-arcade-card ${activeGame ? 'player-active' : ''} ${isFullscreen ? 'card-fullscreen' : ''}`}
        ref={playerContainerRef}
      >
        {activeGame ? (
          /* Embedded Game Player View */
          <div className="arcade-player-view">
            <div className="arcade-player-header">
              <div className="arcade-player-header-left">
                <button 
                  type="button" 
                  className="arcade-btn-back"
                  onClick={() => setActiveGame(null)}
                  title="Back to Games"
                  aria-label="Back to Games"
                >
                  <ArrowLeft size={18} />
                  <span>Back to Games</span>
                </button>
                <div className="arcade-player-title-badge">
                  <Gamepad2 size={18} className="arcade-icon-accent" />
                  <h3 className="arcade-player-game-title">{activeGame.game_name}</h3>
                </div>
                {activeGame.assigned_lesson && (
                  <span className="arcade-lesson-pill">{activeGame.assigned_lesson}</span>
                )}
              </div>

              <div className="arcade-player-header-right">
                <a
                  href={activeGame.game_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arcade-btn-control"
                  title="Open in New Tab"
                  aria-label="Open in New Tab"
                >
                  <ExternalLink size={16} />
                  <span className="btn-text-desktop">New Tab</span>
                </a>

                <button
                  type="button"
                  className="arcade-btn-control"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
                  aria-label={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  <span className="btn-text-desktop">{isFullscreen ? "Exit Fullscreen" : "Full Screen"}</span>
                </button>

                <button
                  type="button"
                  className="arcade-btn-close"
                  onClick={onClose}
                  title="Close Arcade"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="arcade-player-body">
              <iframe
                src={activeGame.game_url}
                title={activeGame.game_name}
                className="arcade-player-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                allow="fullscreen; autoplay; gamepad"
              />
            </div>
          </div>
        ) : (
          /* Celebratory Game Selection Grid */
          <div className="arcade-selection-view">
            <div className="arcade-header">
              <div className="arcade-header-content">
                <div className="arcade-title-row">
                  <span className="arcade-trophy-icon" aria-hidden="true">
                    <Trophy size={28} />
                  </span>
                  <h2 id="arcade-modal-title" className="arcade-title">
                    🕹️ Sandbox Arcade — All Tests Passed!
                  </h2>
                </div>
                <p className="arcade-description">
                  Great work! You've unlocked games from your most advanced completed lessons.
                </p>
                {highestMilestone && (
                  <div className="arcade-milestone-banner">
                    <Sparkles size={16} />
                    <span>Unlocked milestone: <strong>{highestMilestone}</strong></span>
                  </div>
                )}
              </div>
              <button 
                type="button" 
                className="arcade-btn-close" 
                onClick={onClose}
                aria-label="Close Arcade"
              >
                <X size={22} />
              </button>
            </div>

            <div className="arcade-body">
              {isLoading ? (
                <div className="arcade-loading-state">
                  <div className="arcade-spinner" />
                  <p>Loading arcade games...</p>
                </div>
              ) : error ? (
                <div className="arcade-error-state">
                  <p>{error}</p>
                  <button type="button" className="arcade-btn-retry" onClick={fetchGames}>
                    Try Again
                  </button>
                </div>
              ) : games.length === 0 ? (
                <div className="arcade-empty-state">
                  <Gamepad2 size={48} className="arcade-empty-icon" />
                  <h3>No games unlocked yet</h3>
                  <p>Keep completing lessons and tests to unlock exciting games in the Sandbox Arcade!</p>
                </div>
              ) : (
                <div className="arcade-games-grid">
                  {games.map((game) => (
                    <div key={game.id || game.game_name} className="arcade-game-card">
                      <div className="game-card-header">
                        <h4 className="game-card-title">{game.game_name}</h4>
                        {game.rating && (
                          <div className="game-card-rating" title={`Rating: ${game.rating}`}>
                            <Star size={14} className="star-icon filled" />
                            <span>{game.rating}</span>
                          </div>
                        )}
                      </div>

                      <div className="game-card-badges">
                        {game.assigned_lesson && (
                          <span className="game-badge-lesson" title="Assigned Lesson">
                            {game.assigned_lesson}
                          </span>
                        )}
                        {game.requires_account && (
                          <span className="game-badge-account" title="Account Required">
                            <Lock size={12} /> Account Required
                          </span>
                        )}
                      </div>

                      {game.comment && (
                        <p className="game-card-comment" title={game.comment}>
                          {game.comment}
                        </p>
                      )}

                      <div className="game-card-actions">
                        <button
                          type="button"
                          className="arcade-action-btn play-now"
                          onClick={() => setActiveGame(game)}
                        >
                          <Play size={15} fill="currentColor" />
                          <span>Play Now</span>
                        </button>
                        <a
                          href={game.game_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="arcade-action-btn open-tab"
                          title="Open in New Tab"
                        >
                          <ExternalLink size={15} />
                          <span>Open in New Tab</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SandboxArcadeModal;
