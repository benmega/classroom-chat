import React, { useState, useEffect, useCallback } from 'react';
import { 
  UploadCloud, 
  Download, 
  ExternalLink, 
  Star, 
  Lock, 
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import GameRewardsCsvModal from '../../components/admin/GameRewardsCsvModal';
import './AdminGameCatalog.css';

const AdminGameCatalog = () => {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/api/admin/level-games');
      setGames(res.data?.games || []);
    } catch (err) {
      console.error('Failed to fetch level games:', err);
      toast.error('Failed to load game catalog.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleDownloadSampleCsv = async () => {
    setIsDownloadingSample(true);
    try {
      const response = await client.get('/api/admin/level-games/sample-csv', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample_level_games.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Sample CSV downloaded.');
    } catch (err) {
      console.error('Failed to download sample CSV:', err);
      toast.error('Failed to download sample CSV.');
    } finally {
      setIsDownloadingSample(false);
    }
  };

  return (
    <div className="admin-game-catalog" data-testid="AdminGameCatalog">
      {/* Action Bar matching Courses, Achievements, and Projects */}
      <div className="d-flex justify-end mb-1-5rem">
        <div className="d-flex gap-md">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleDownloadSampleCsv}
            disabled={isDownloadingSample}
            title="Download sample CSV template"
          >
            <Download size={18} />
            <span>{isDownloadingSample ? 'Downloading...' : 'Sample CSV'}</span>
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={() => setIsCsvModalOpen(true)}
            title="Upload CSV to update catalog"
          >
            <UploadCloud size={18} />
            <span>Upload Game CSV</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card catalog-content-card">
        {isLoading ? (
          <div className="text-center text-muted py-2rem">
            Loading game catalog...
          </div>
        ) : games.length === 0 ? (
          <div className="empty-state text-muted" style={{ width: '100%', textAlign: 'center', padding: '30px 20px' }}>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>No games found</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
              The global game catalog is empty. Upload a CSV spreadsheet to populate arcade games.
            </p>
            <button
              type="button"
              className="primary-btn mt-1rem"
              style={{ margin: '1rem auto 0' }}
              onClick={() => setIsCsvModalOpen(true)}
            >
              <UploadCloud size={16} />
              <span>Upload First CSV</span>
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>Game Title</th>
                  <th>Platform</th>
                  <th>Assigned Milestone</th>
                  <th>Challenge</th>
                  <th>Rating</th>
                  <th>Account?</th>
                  <th>Verified</th>
                  <th>Play Link</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, idx) => (
                  <tr key={game.id || `${game.game_name}-${idx}`}>
                    <td className="cell-title-col">
                      <span className="game-title-text" title={game.game_name}>
                        {game.game_name}
                      </span>
                      {game.comment && (
                        <span className="game-comment-text" title={game.comment}>
                          {game.comment}
                        </span>
                      )}
                    </td>
                    <td>
                      {game.platform ? (
                        <span className="platform-tag">{game.platform}</span>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className="milestone-pill">
                        {game.assigned_lesson || 'General'}
                      </span>
                    </td>
                    <td>
                      {game.challenge_slug ? (
                        <span className="challenge-tag">{game.challenge_slug}</span>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td>
                      {game.rating ? (
                        <div className="rating-pill">
                          <Star size={13} fill="#f59e0b" color="#f59e0b" />
                          <span>{game.rating}</span>
                        </div>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td>
                      {game.requires_account ? (
                        <span className="badge-account-required" title="Requires Account">
                          <Lock size={12} /> Yes
                        </span>
                      ) : (
                        <span className="badge-account-optional">No</span>
                      )}
                    </td>
                    <td>
                      {game.verified ? (
                        <span className="badge-verified">
                          <CheckCircle2 size={13} /> Verified
                        </span>
                      ) : (
                        <span className="cell-muted">Unverified</span>
                      )}
                    </td>
                    <td>
                      <a
                        href={game.game_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="game-launch-link"
                        title={game.game_url}
                      >
                        <span>Play</span>
                        <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV Upload / Management Modal */}
      <GameRewardsCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          fetchGames();
        }}
      />
    </div>
  );
};

export default AdminGameCatalog;
