import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const LandingMobile = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-page landing-page-mobile animate-page-entry">
            <nav className="landing-nav glass-panel mobile-nav">
                <div className="landing-nav-brand">
                    <img src="/images/logo.ico" alt="Classroom Chat Logo" className="brand-icon" style={{ width: '28px', height: '28px' }} />
                    <h1 style={{ fontSize: '1.25rem' }}>Classroom Chat</h1>
                </div>
            </nav>

            <main className="landing-main">
                <section className="hero-section hero-mobile">
                    <div className="hero-content" style={{ alignItems: 'center', textAlign: 'center' }}>
                        <h2 className="animate-fade-in" style={{ fontSize: '2.5rem', lineHeight: '1.1' }}>
                            Ready to <span style={{color: 'var(--primary-color)'}}>level up</span> your coding?
                        </h2>
                        <p className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.1s', fontSize: '1.1rem', margin: '0 auto' }}>
                            A fun space for students to build projects and parents to track progress.
                        </p>
                        
                        <div className="hero-visual animate-float" style={{ margin: '1rem 0' }}>
                            <div className="slideshow-window glass-panel" style={{ width: '100%', maxWidth: '100%', borderRadius: '16px' }}>
                                <div className="slideshow-track">
                                    <img src="/images/code_combat.png" alt="Code Combat" className="slide" style={{ objectFit: 'cover' }} />
                                    <img src="/images/ozaria.png" alt="Ozaria" className="slide" style={{ objectFit: 'cover' }} />
                                    <img src="/images/pycharm.png" alt="PyCharm IDE" className="slide" style={{ objectFit: 'cover' }} />
                                    <img src="/images/turtle_code.png" alt="Turtle Code" className="slide" style={{ objectFit: 'cover' }} />
                                    <img src="/images/printed_ducks.png" alt="3D Printed Ducks" className="slide" style={{ objectFit: 'cover' }} />
                                </div>
                            </div>
                        </div>

                        <div className="hero-cta animate-fade-in" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
                            <button onClick={() => navigate('/login')} className="btn-premium btn-premium-lg" style={{ width: '100%' }}>
                                Login
                            </button>
                            <button onClick={() => navigate('/signup')} className="btn-secondary" style={{ width: '100%', padding: '0.8rem' }}>
                                Sign Up
                            </button>
                            <button onClick={() => navigate('/signup?role=educator')} className="btn-secondary" style={{ width: '100%', padding: '0.8rem' }}>
                                I'm an Educator
                            </button>
                            <button onClick={() => navigate('/signup?role=parent')} className="btn-secondary" style={{ width: '100%', padding: '0.8rem' }}>
                                I'm a Parent
                            </button>
                        </div>
                    </div>
                </section>

                <section className="features-section container" style={{ paddingTop: '2rem' }}>
                    <h3 className="section-title" style={{ fontSize: '1.75rem' }}>Why Classroom Chat?</h3>
                    <div className="features-grid mobile-grid">
                        <div className="feature-card card-premium" style={{ alignItems: 'center', textAlign: 'center' }}>
                            <div className="feature-icon">💬</div>
                            <h4>Real-Time Chat</h4>
                            <p>Engage in instant messaging with peers and teachers for seamless collaboration.</p>
                        </div>
                        <div className="feature-card card-premium" style={{ alignItems: 'center', textAlign: 'center' }}>
                            <div className="feature-icon">🏆</div>
                            <h4>Achievements</h4>
                            <p>Earn badges and certificates as you progress through your learning journey.</p>
                        </div>
                        <div className="feature-card card-premium" style={{ alignItems: 'center', textAlign: 'center' }}>
                            <div className="feature-icon">👨‍👩‍👧</div>
                            <h4>Parent Access</h4>
                            <p>Stay involved with transparent progress tracking and easy communication.</p>
                        </div>
                        <div className="feature-card card-premium" style={{ alignItems: 'center', textAlign: 'center' }}>
                            <div className="feature-icon">🛠️</div>
                            <h4>Admin Controls</h4>
                            <p>Comprehensive tools for teachers and admins to manage the classroom environment.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <p>&copy; {new Date().getFullYear()} Classroom Chat.</p>
            </footer>
        </div>
    );
};

export default LandingMobile;
