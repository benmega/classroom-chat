import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

import youShallNotPassImage from '../../assets/you_shall_not_pass.png';
import './AccessDenied.css';

const AccessDenied = () => {
  return (
    <div className="access-denied-container">
      <div className="access-denied-card">
        
        <img 
          src={youShallNotPassImage} 
          alt="You Shall Not Pass" 
          className="access-denied-img"
        />

        <h1 className="access-denied-title">
          YOU SHALL NOT PASS! 🧙‍♂️
        </h1>
        
        <p className="access-denied-text">
          The dark fire will not avail you, flame of Udûn! This is a restricted area. 
          Return to the shadows... or just go back to the homepage.
        </p>
        
        <div className="access-denied-actions">
          <Link to="/chat" className="access-denied-btn-home">
            <Home size={20} />
            Return Home
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="access-denied-btn-back"
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

