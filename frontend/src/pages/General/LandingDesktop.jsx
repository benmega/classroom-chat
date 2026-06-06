import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const LandingDesktop = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-page animate-page-entry">
            <nav className="landing-nav glass-panel">
                <div className="landing-nav-brand">
                    <img src="/images/logo.ico" alt="Classroom Chat Logo" className="brand-icon" style={{ width: '32px', height: '32px' }} />
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
                        <h2 className="animate-fade-in" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>
                            Ready to <span style={{color: 'var(--primary-color)'}}>level up</span> your coding?
                        </h2>
                        <p className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.1s', fontSize: '1.25rem' }}>
                            A fun space for students to build projects and parents to track progress.
                        </p>
                        
                        <div className="hero-cta animate-fade-in" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: '1rem' }}>

                            <button onClick={() => navigate('/signup?role=student')} className="btn-premium btn-premium-lg">
                                I'm a Student
                            </button>
                            <button onClick={() => navigate('/signup?role=parent')} className="btn-premium btn-premium-lg">
                                I'm a Parent
                            </button>
                        </div>
                    </div>
                    
                    <div className="hero-visual animate-float">
                        <div className="slideshow-window glass-panel">
                            {/* RULE: All slideshow images below must be close to a 16:9 aspect ratio (e.g. 1024x576) to avoid awkward cropping */}
                            <div className="slideshow-track">
                                <img src="/images/code_combat.png" alt="Code Combat" className="slide" style={{ objectFit: 'cover' }} />
                                <img src="/images/ozaria.png" alt="Ozaria" className="slide" style={{ objectFit: 'cover' }} />
                                <img src="/images/pycharm.png" alt="PyCharm IDE" className="slide" style={{ objectFit: 'cover' }} />
                                <img src="/images/turtle_code.png" alt="Turtle Code" className="slide" style={{ objectFit: 'cover' }} />
                                <img src="/images/printed_ducks.png" alt="3D Printed Ducks" className="slide" style={{ objectFit: 'cover' }} />
                            </div>
                        </div>
                    </div>
                </section>


            </main>

            <footer className="landing-footer">
                <p>&copy; {new Date().getFullYear()} Classroom Chat. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingDesktop;
