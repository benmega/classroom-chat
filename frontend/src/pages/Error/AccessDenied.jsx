import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

import youShallNotPassImage from '../../assets/you_shall_not_pass.png';
import rubberDuckImage from '../../assets/rubber_duck.png';

const AccessDenied = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--text-primary)',
      color: 'var(--bg-secondary)',
      fontFamily: 'var(--font-body)',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        padding: '2rem',
        borderRadius: '1.5rem',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            padding: '1rem',
            borderRadius: '1rem'
          }}>
            <img src={rubberDuckImage} alt="Rubber Duck Icon" style={{ width: 48, height: 48, display: 'block' }} />
          </div>
        </div>
        
        <img 
          src={youShallNotPassImage} 
          alt="You Shall Not Pass" 
          style={{
            width: '100%',
            maxWidth: '400px',
            marginBottom: '1rem',
            borderRadius: '0.5rem',
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto'
          }} 
        />
        
        <p style={{
          fontSize: '1.125rem',
          color: 'var(--text-muted)',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          The dark fire will not avail you, flame of Udûn! This is a restricted area. 
          Return to the shadows... or just go back to the homepage.
        </p>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Link to="/chat" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--shadow-md)'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--blue-600)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary-color)'}
          >
            <Home size={20} />
            Return Home
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border-strong)',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--text-muted)';
              e.target.style.color = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border-strong)';
              e.target.style.color = 'var(--text-muted)';
            }}
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
