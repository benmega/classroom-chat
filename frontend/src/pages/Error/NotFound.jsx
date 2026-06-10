import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

const NotFound = ({ message = "The page or resource you are looking for doesn't exist or has been moved." }) => {
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
        background: 'rgba(59, 130, 246, 0.1)',
        padding: '3rem',
        borderRadius: '2rem',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        maxWidth: '550px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
            padding: '1.5rem',
            borderRadius: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileQuestion size={64} color="#60a5fa" strokeWidth={1.5} />
          </div>
        </div>
        
        <h1 style={{
          fontSize: '3rem',
          fontWeight: '800',
          marginBottom: '1rem',
          letterSpacing: '-0.025em',
          background: 'linear-gradient(to bottom right, white, var(--text-muted))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          404
        </h1>
        
        <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'var(--border-subtle)'
        }}>
            Resource Not Found
        </h2>
        
        <p style={{
          fontSize: '1.125rem',
          color: 'var(--text-muted)',
          marginBottom: '2.5rem',
          lineHeight: '1.6'
        }}>
          {message}
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
            padding: '0.875rem 1.5rem',
            borderRadius: '1rem',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'var(--shadow-md)'
          }}
          onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.backgroundColor = 'var(--blue-600)';
          }}
          onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.backgroundColor = 'var(--primary-color)';
          }}
          >
            <Home size={20} />
            Back to Dashboard
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              color: 'var(--text-muted)',
              padding: '0.875rem 1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border-strong)',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              fontSize: '1rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#475569';
              e.target.style.color = '#f8fafc';
              e.target.style.backgroundColor = 'rgba(30, 41, 59, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#334155';
              e.target.style.color = '#cbd5e1';
              e.target.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
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

export default NotFound;
