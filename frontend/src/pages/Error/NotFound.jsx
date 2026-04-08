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
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
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
          background: 'linear-gradient(to bottom right, #ffffff, #94a3b8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          404
        </h1>
        
        <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#e2e8f0'
        }}>
            Resource Not Found
        </h2>
        
        <p style={{
          fontSize: '1.125rem',
          color: '#94a3b8',
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
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.875rem 1.5rem',
            borderRadius: '1rem',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
          }}
          onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.backgroundColor = '#3b82f6';
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
              color: '#cbd5e1',
              padding: '0.875rem 1.5rem',
              borderRadius: '1rem',
              border: '1px solid #334155',
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
