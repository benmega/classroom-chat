import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import './Landing.css';

const Landing = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    // If authenticated, automatically go to chat
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/chat');
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className="landing-page animate-page-entry">
            <nav className="landing-nav glass-panel">
                <div className="landing-nav-brand">
                    <img src="/images/logo.ico" alt="Classroom Chat Logo" className="brand-icon" style={{ width: '32px', height: '32px' }} />
                    <h1>Classroom Chat</h1>
                </div>
                <div className="landing-nav-actions">
                    <button onClick={() => navigate('/login')} className="btn-premium btn-premium-sm">Login</button>
                    <button onClick={() => navigate('/signup')} className="btn-secondary">Sign Up</button>
                </div>
            </nav>

            <main className="landing-main">
                <section className="hero-section">
                    <div className="hero-content">
                        <h2 className="animate-fade-in" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                            Ready to <span style={{color: 'var(--primary-color)'}}>level up</span> your coding?
                        </h2>
                        <p className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.1s', fontSize: '1.25rem' }}>
                            A fun space for students to build projects and parents to track progress.
                        </p>
                        
                        <div className="hero-cta animate-fade-in" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
                            <button onClick={() => navigate('/signup?role=educator')} className="btn-premium btn-premium-lg" style={{ width: '100%' }}>
                                I'm an Educator
                            </button>
                            <button onClick={() => navigate('/signup?role=parent')} className="btn-premium btn-premium-lg" style={{ width: '100%' }}>
                                I'm a Parent
                            </button>
                            <button onClick={() => navigate('/login')} className="btn-premium btn-premium-lg" style={{ width: '100%' }}>
                                Start Playing
                            </button>
                        </div>
                    </div>
                    
                    <div className="hero-visual animate-float">
                        <div className="slideshow-window glass-panel">
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

                <section className="features-section container">
                    <h3 className="section-title">Why Classroom Chat?</h3>
                    <div className="features-grid">
                        <div className="feature-card card-premium">
                            <div className="feature-icon">💬</div>
                            <h4>Real-Time Chat</h4>
                            <p>Engage in instant messaging with peers and teachers for seamless collaboration.</p>
                        </div>
                        <div className="feature-card card-premium">
                            <div className="feature-icon">🏆</div>
                            <h4>Achievements</h4>
                            <p>Earn badges and certificates as you progress through your learning journey.</p>
                        </div>
                        <div className="feature-card card-premium">
                            <div className="feature-icon">👨‍👩‍👧</div>
                            <h4>Parent Access</h4>
                            <p>Stay involved with transparent progress tracking and easy communication.</p>
                        </div>
                        <div className="feature-card card-premium">
                            <div className="feature-icon">🛠️</div>
                            <h4>Admin Controls</h4>
                            <p>Comprehensive tools for teachers and admins to manage the classroom environment.</p>
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

export default Landing;
