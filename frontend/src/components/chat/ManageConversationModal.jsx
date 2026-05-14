import React from 'react';
import { X, Lock, Clock, Trash2 } from 'lucide-react';
import { THEME } from '../../utils/theme';

const ManageConversationModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onDelete,
  title, 
  setTitle, 
  isLocked, 
  setIsLocked, 
  slowMode, 
  setSlowMode, 
  isUpdating 
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-primary)',
        padding: '2rem',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Manage Conversation</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Conversation Title
            </label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                <Lock size={18} color={THEME.colors.error} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Lock Conversation</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Prevent students from posting</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: isLocked ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                position: 'relative',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: isLocked ? '23px' : '3px',
                transition: 'all 0.2s'
              }} />
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Clock size={18} color="var(--primary-color)" />
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Slow Mode (seconds)</label>
            </div>
            <input 
              type="range"
              min="0"
              max="60"
              step="5"
              value={slowMode}
              onChange={(e) => setSlowMode(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Off</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-color)' }}>{slowMode}s</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>60s</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button 
              type="button"
              onClick={onDelete}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: `1px solid ${THEME.colors.error}`,
                background: 'none',
                color: THEME.colors.error,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                flex: '0 0 auto'
              }}
              title="Delete Conversation"
            >
              <Trash2 size={18} />
            </button>
            
            <button 
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            
            <button 
              type="submit"
              disabled={isUpdating}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--gradient-primary)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                opacity: isUpdating ? 0.6 : 1
              }}
            >
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageConversationModal;
