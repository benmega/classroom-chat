import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

const AccessDenied = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
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
            <ShieldAlert size={48} color="#ef4444" strokeWidth={1.5} />
          </div>
        </div>
        
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: '800',
          marginBottom: '1rem',
          letterSpacing: '-0.025em',
          background: 'linear-gradient(to right, #f8fafc, #94a3b8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Access Denied
        </h1>
        
        <p style={{
          fontSize: '1.125rem',
          color: '#94a3b8',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          You've reached a restricted area. Only administrators have permission to access this page. 
          If you believe this is an error, please contact your teacher.
        </p>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
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
              color: '#94a3b8',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid #334155',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#475569';
              e.target.style.color = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#334155';
              e.target.style.color = '#94a3b8';
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
