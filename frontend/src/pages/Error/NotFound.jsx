import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

import './NotFound.css';

const NotFound = ({ message = "The page or resource you are looking for doesn't exist or has been moved." }) => {
  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <div className="not-found-icon-wrapper">
          <div className="not-found-icon-box">
            <FileQuestion size={64} color="#60a5fa" strokeWidth={1.5} />
          </div>
        </div>
        
        <h1 className="not-found-title">
          404
        </h1>
        
        <h2 className="not-found-subtitle">
            Resource Not Found
        </h2>
        
        <p className="not-found-text">
          {message}
        </p>
        
        <div className="not-found-actions">
          <Link to="/chat" className="not-found-btn-home">
            <Home size={20} />
            Back to Dashboard
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="not-found-btn-back"
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
