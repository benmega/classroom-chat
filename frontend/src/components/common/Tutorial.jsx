import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  X, 
  ChevronRight, 
  MousePointer2,
  Sparkles
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import './Tutorial.css';

const studentSlides = [
  {
    target: 'body',
    title: "Welcome!",
    description: "Ready to explore?",
    icon: <Sparkles size={32} />,
    position: 'center'
  },
  {
    target: '.stat-badge.ducks',
    title: "Rewards",
    description: "Earn ducks as you learn.",
    icon: <MousePointer2 size={24} />,
    position: 'bottom'
  },
  {
    target: '.hamburger-toggle, .desktop-nav-rail',
    title: "Account",
    description: "Settings & Profile here.",
    icon: <MousePointer2 size={24} />,
    position: 'bottom-left' // Custom position to avoid overflow
  }
];

const parentSlides = [
  {
    target: 'body',
    title: "Welcome!",
    description: "Let's get you set up.",
    icon: <Sparkles size={32} />,
    position: 'center'
  },
  {
    target: '.hamburger-toggle, .desktop-nav-rail',
    title: "Account Settings",
    description: "Manage your profile and settings here.",
    icon: <MousePointer2 size={24} />,
    position: 'bottom-left'
  }
];

// A selector can match several elements, some of them hidden at the current
// viewport size (e.g. the desktop rail on phones, the hamburger on desktop).
// Take the first one that is actually laid out: a display:none element still
// has a rect, but an all-zero one.
const resolveTarget = (selector) => (
  Array.from(document.querySelectorAll(selector)).find((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) || null
);

// Slides whose target is not on screen (hidden at this viewport size, or not rendered
// at all) are skipped instead of pointing the spotlight at nothing.
const getVisibleSlides = (allSlides) => (
  allSlides.filter((slide) => slide.target === 'body' || resolveTarget(slide.target))
);

const getSpotlightRect = (slide) => {
  if (slide.target === 'body') return null;
  const element = resolveTarget(slide.target);
  return element ? element.getBoundingClientRect() : null;
};

const sameSlides = (a, b) => a.length === b.length && a.every((slide, i) => slide === b[i]);

const Tutorial = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const location = useLocation();
  const { user, completeTutorial } = useAuthStore();

  const isParent = user?.role === 'parent';
  const slides = isParent ? parentSlides : studentSlides;
  // The slides that can be shown right now; recomputed when the tour opens and on resize.
  const [visibleSlides, setVisibleSlides] = useState(slides);
  // Keeps the index valid if a resize shrinks the list under the current slide.
  const slideIndex = Math.min(currentSlide, visibleSlides.length - 1);

  useEffect(() => {
    if (!user) return;
    
    // Check path based on role
    if (isParent) {
        if (location.pathname !== '/parent/dashboard') return;
    } else {
        if (location.pathname !== '/') return;
    }

    if (!user.has_seen_tutorial) {
      const timer = setTimeout(() => {
        const nextSlides = getVisibleSlides(slides);
        setVisibleSlides((prev) => (sameSlides(prev, nextSlides) ? prev : nextSlides));
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, user, isParent, slides]);

  const handleClose = useCallback(() => {
    if (user && !user.has_seen_tutorial) {
      completeTutorial();
    }
    setIsOpen(false);
  }, [user, completeTutorial]);

  useLayoutEffect(() => {
    if (isOpen) {
      const rect = getSpotlightRect(visibleSlides[slideIndex]);
      
      const frame = requestAnimationFrame(() => {
        setSpotlightRect(rect);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen, slideIndex, visibleSlides]);

  useEffect(() => {
    if (!isOpen) return;

    let frameId;
    const updateRect = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        // A resize can show or hide targets, so re-check which slides apply.
        const nextSlides = getVisibleSlides(slides);
        setVisibleSlides((prev) => (sameSlides(prev, nextSlides) ? prev : nextSlides));
        const slide = nextSlides[Math.min(currentSlide, nextSlides.length - 1)];
        if (slide.target === 'body') {
          setSpotlightRect(null);
          return;
        }
        const element = resolveTarget(slide.target);
        if (element) {
          setSpotlightRect(element.getBoundingClientRect());
        }
      });
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isOpen, currentSlide, slides]);



  const handleNext = () => {
    if (slideIndex < visibleSlides.length - 1) {
      setCurrentSlide(slideIndex + 1);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const slide = visibleSlides[slideIndex];

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
      case 'top':
        top = spotlightRect.top - 20;
        left = spotlightRect.left + (spotlightRect.width / 2);
        transform = 'translate(-50%, -100%)';
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
    const estimatedCardHeight = 220;
    
    if (typeof left === 'number') {
      if (left + cardWidth > window.innerWidth - padding) {
        left = window.innerWidth - cardWidth - padding;
      }
      if (left < padding) left = padding;
    }

    if (typeof top === 'number') {
      if (top + estimatedCardHeight > window.innerHeight - padding) {
        top = window.innerHeight - estimatedCardHeight - padding;
      }
      if (top < padding) top = padding;
    }

    return { top, left, transform };
  };

  return (
    <div className="spotlight-overlay">
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
            {visibleSlides.map((_, i) => (
              <div key={i} className={`spotlight-dot ${i === slideIndex ? 'active' : ''}`} />
            ))}
          </div>
          <button className="btn-premium btn-premium-sm" onClick={handleNext}>
            {slideIndex === visibleSlides.length - 1 ? 'Got it!' : 'Next'}
            <ChevronRight size={16} />
          </button>
        </div>

        <button className="spotlight-skip" onClick={handleClose} aria-label="Close tutorial">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Tutorial;
