import React from 'react';
import { useNavigate } from 'react-router-dom';
import LandingSlideshow from './LandingSlideshow';
import './Landing.css';

const LandingDesktop = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-page animate-page-entry">
            <nav className="landing-nav glass-panel">
                <div className="landing-nav-brand">
                    <img src="/images/logo.png" alt="Classroom Chat Logo" className="brand-icon w-32px h-32px" />
                    <h1>Classroom Chat</h1>
                </div>
                <div className="landing-nav-actions">
                    <button onClick={() => navigate('/login')} className="btn-secondary btn-secondary-sm">Login</button>
                    <button onClick={() => navigate('/signup')} className="btn-premium btn-premium-sm">Sign Up</button>
                </div>
            </nav>

            <main className="landing-main">
                <section className="hero-section hero-desktop">
                    <div className="hero-content">
                        <h2 className="animate-fade-in landing-title">
                            Ready to <span className="text-primary-color">level up</span> your coding?
                        </h2>
                        <p className="hero-subtitle animate-fade-in landing-subtitle">
                            A space for students to build projects and parents to track progress.
                        </p>
                        
                        <div className="hero-cta animate-fade-in landing-cta">
                            <button onClick={() => navigate('/signup')} className="btn-premium btn-premium-lg">
                                I'm New
                            </button>
                            <button onClick={() => navigate('/login')} className="btn-premium btn-premium-lg">
                                I'm Back
                            </button>
                        </div>
                    </div>
                    
                    <div className="hero-visual animate-float">
                        <LandingSlideshow />
                    </div>
                </section>


            </main>

        </div>
    );
};

export default LandingDesktop;
