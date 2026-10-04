import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import useModalA11y from '../../hooks/useModalA11y';

const NoteSlideshow = ({ notes, currentIndex, onClose, onPrev, onNext }) => {
    const dialogRef = useRef(null);
    const isOpen = currentIndex !== null && Boolean(notes[currentIndex]);

    useModalA11y({ isOpen, onClose, containerRef: dialogRef });

    if (!isOpen) return null;

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft') onPrev();
        else if (e.key === 'ArrowRight') onNext();
    };

    return createPortal(
        // The overlay is the dialog itself: the close and arrow buttons are positioned against it.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Note viewer"
            tabIndex={-1}
            className="slideshow-overlay"
            onKeyDown={handleKeyDown}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <button className="close-slideshow" onClick={onClose} aria-label="Close slideshow"><X size={32} /></button>
            <button className="nav-slide prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous note">
                <ChevronLeft size={48} />
            </button>
            <div className="slide-content">
                <SmartImage
                    src={notes[currentIndex].url}
                    alt="Note full view"
                    fallbackType="project"
                />
            </div>
            <button className="nav-slide next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next note">
                <ChevronRight size={48} />
            </button>
        </div>,
        document.body
    );
};

export default NoteSlideshow;
