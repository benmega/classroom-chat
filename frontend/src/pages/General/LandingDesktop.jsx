import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const LandingDesktop = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-page animate-page-entry">
            <nav className="landing-nav glass-panel">
                <div className="landing-nav-brand">
                    <img src="/images/logo.ico" alt="Classroom Chat Logo" className="brand-icon w-32px h-32px" />
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
                        <div className="slideshow-window glass-panel">
                            {/* RULE: All slideshow images below must be close to a 16:9 aspect ratio (e.g. 1024x576) to avoid awkward cropping */}
                            <div className="slideshow-track">
                                <img src="/images/code_combat.png" alt="Code Combat" className="slide object-cover" />
                                <img src="/images/ozaria.png" alt="Ozaria" className="slide object-cover" />
                                <img src="/images/pycharm.png" alt="PyCharm IDE" className="slide object-cover" />
                                <img src="/images/turtle_code.png" alt="Turtle Code" className="slide object-cover" />
                                <img src="/images/printed_ducks.png" alt="3D Printed Ducks" className="slide object-cover" />
                            </div>
                        </div>
                    </div>
                </section>


            </main>

        </div>
    );
};

export default LandingDesktop;
