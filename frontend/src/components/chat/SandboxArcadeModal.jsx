import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Play, 
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

  const fetchGames = useCallback(async () => {
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
  }, [classId]);

  // Load sandbox games when opened & trigger celebration
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, classId, fetchGames]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <div 
      className="sandbox-arcade-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="arcade-modal-title"
    >
      <div className="sandbox-arcade-card">
        {/* Celebratory Game Selection Grid */}
        <div className="arcade-selection-view">
          <div className="arcade-header">
            <div className="arcade-header-content">
              <div className="arcade-title-row">
                <span className="arcade-trophy-icon" aria-hidden="true">
                  <Trophy size={28} />
                </span>
                <h2 id="arcade-modal-title" className="arcade-title">
                  Sandbox Mode!
                </h2>
              </div>
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

                    {game.requires_account && (
                      <div className="game-card-badges">
                        <span className="game-badge-account" title="Account Required">
                          <Lock size={12} /> Account Required
                        </span>
                      </div>
                    )}

                    <div className="game-card-actions">
                      <a
                        href={game.game_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="arcade-action-btn play-now"
                      >
                        <Play size={15} fill="currentColor" />
                        <span>Play Now</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SandboxArcadeModal;
