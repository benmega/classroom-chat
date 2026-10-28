import React, { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './Landing.css';

// RULE: All slideshow images must be close to a 16:9 aspect ratio (e.g. 1024x576) to avoid awkward cropping
const SLIDES = [
    { src: '/images/code_combat.png', alt: 'Code Combat' },
    { src: '/images/ozaria.png', alt: 'Ozaria' },
    { src: '/images/pycharm.png', alt: 'PyCharm IDE' },
    { src: '/images/turtle_code.png', alt: 'Turtle Code' },
    { src: '/images/printed_ducks.png', alt: '3D Printed Ducks' },
];

/**
 * The landing page screenshot slideshow. It starts on its own and keeps moving, so it has a pause button
 * (WCAG 2.2.2). Visitors who ask for reduced motion get the first slide and no button: index.css cuts the
 * animation to a single instant step for them (see the reduced-motion block there), and Landing.css hides the button.
 */
const LandingSlideshow = ({ style }) => {
    const [paused, setPaused] = useState(false);

    return (
        <div
            className="slideshow-window glass-panel"
            style={style}
            role="group"
            aria-roledescription="carousel"
            aria-label="Screenshots of what students build"
        >
            <div className={`slideshow-track${paused ? ' is-paused' : ''}`}>
                {SLIDES.map((slide) => (
                    <img key={slide.src} src={slide.src} alt={slide.alt} className="slide object-cover" />
                ))}
            </div>
            <button
                type="button"
                className="slideshow-toggle"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
            >
                {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
            </button>
        </div>
    );
};

export default LandingSlideshow;
