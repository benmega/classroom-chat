import React from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import SmartImage from '../common/SmartImage';

const NoteSlideshow = ({ notes, currentIndex, onClose, onPrev, onNext }) => {
    if (currentIndex === null || !notes[currentIndex]) return null;

    return createPortal(
        <div className="slideshow-overlay" onClick={onClose}>
            <button className="close-slideshow" onClick={onClose}><X size={32} /></button>
            <button className="nav-slide prev" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
                <ChevronLeft size={48} />
            </button>
            <div className="slide-content" onClick={e => e.stopPropagation()}>
                <SmartImage 
                    src={notes[currentIndex].url} 
                    alt="Note full view" 
                    fallbackType="project"
                />
            </div>
            <button className="nav-slide next" onClick={(e) => { e.stopPropagation(); onNext(); }}>
                <ChevronRight size={48} />
            </button>
        </div>,
        document.body
    );
};

export default NoteSlideshow;
