import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  X, 
  ChevronRight, 
  MessageSquare, 
  MousePointer2,
  Sparkles
} from 'lucide-react';
import './Tutorial.css';

const slides = [
  {
    target: 'body',
    title: "Welcome!",
    description: "Ready to explore?",
    icon: <Sparkles size={32} />,
    position: 'center'
  },
  {
    target: '.chat-sidebar',
    title: "Channels",
    description: "Join the conversation here.",
    icon: <MessageSquare size={24} />,
    position: 'right'
  },
  {
    target: '#sidebar-announcements-pin',
    title: "Notices",
    description: "Important updates from instructors.",
    icon: <Sparkles size={24} />,
    position: 'right'
  },
  {
    target: '.stat-badge.ducks',
    title: "Rewards",
    description: "Earn ducks as you learn.",
    icon: <MousePointer2 size={24} />,
    position: 'bottom'
  },
  {
    target: '.profile-toggle',
    title: "Account",
    description: "Settings & Profile here.",
    icon: <MousePointer2 size={24} />,
    position: 'bottom-left' // Custom position to avoid overflow
  }
];

const Tutorial = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const containerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    // Only show tutorial on the home page (chat page)
    if (location.pathname !== '/') return;

    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useLayoutEffect(() => {
    if (isOpen) {
      const slide = slides[currentSlide];
      const element = document.querySelector(slide.target);
      if (element) {
        setSpotlightRect(element.getBoundingClientRect());
      } else {
        setSpotlightRect(null);
      }
    }
  }, [isOpen, currentSlide]);

  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        const slide = slides[currentSlide];
        const element = document.querySelector(slide.target);
        if (element) setSpotlightRect(element.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, currentSlide]);

  const handleClose = () => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const slide = slides[currentSlide];

  const getCardStyles = () => {
    if (!spotlightRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    let top = 0;
    let left = 0;
    let transform = 'none';

    switch (slide.position) {
      case 'center':
        top = '50%';
        left = '50%';
        transform = 'translate(-50%, -50%)';
        break;
      case 'right':
        top = spotlightRect.top + (spotlightRect.height / 2);
        left = spotlightRect.right + 20;
        transform = 'translateY(-50%)';
        break;
      case 'bottom':
        top = spotlightRect.bottom + 20;
        left = spotlightRect.left + (spotlightRect.width / 2);
        transform = 'translateX(-50%)';
        break;
      case 'bottom-left':
        top = spotlightRect.bottom + 20;
        left = spotlightRect.right - 280; // Align right edges if possible
        if (left < 20) left = 20;
        break;
      default:
        top = spotlightRect.top;
        left = spotlightRect.left;
    }

    // Viewport clamping
    const cardWidth = 280;
    const padding = 20;
    
    if (typeof left === 'number') {
      if (left + cardWidth > window.innerWidth - padding) {
        left = window.innerWidth - cardWidth - padding;
      }
      if (left < padding) left = padding;
    }

    return { top, left, transform };
  };

  return (
    <div className="spotlight-overlay" ref={containerRef}>
      <svg className="spotlight-svg">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect 
                x={spotlightRect.left - 8} 
                y={spotlightRect.top - 8} 
                width={spotlightRect.width + 16} 
                height={spotlightRect.height + 16} 
                rx="12" 
                fill="black" 
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.7)" mask="url(#spotlight-mask)" />
      </svg>

      <div className={`spotlight-card glass-panel ${slide.position}`} style={getCardStyles()}>
        <div className="spotlight-header">
          <div className="spotlight-icon">{slide.icon}</div>
          <h3 className="spotlight-title">{slide.title}</h3>
        </div>
        <p className="spotlight-desc">{slide.description}</p>
        
        <div className="spotlight-footer">
          <div className="spotlight-dots">
            {slides.map((_, i) => (
              <div key={i} className={`spotlight-dot ${i === currentSlide ? 'active' : ''}`} />
            ))}
          </div>
          <button className="btn-premium btn-premium-sm" onClick={handleNext}>
            {currentSlide === slides.length - 1 ? 'Got it!' : 'Next'}
            <ChevronRight size={16} />
          </button>
        </div>

        <button className="spotlight-skip" onClick={handleClose}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Tutorial;
