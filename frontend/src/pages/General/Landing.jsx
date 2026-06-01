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
                        <h2 className="animate-fade-in">Welcome to Your Virtual Classroom</h2>
                        <p className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            A unified space for students to learn, communicate, and grow. Parents, teachers, and admins can stay connected and informed.
                        </p>
                        
                        <div className="hero-cta animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            <button onClick={() => navigate('/login')} className="btn-premium btn-premium-lg">
                                Student Login
                            </button>
                            <div className="secondary-roles">
                                <span>Are you a Parent or Admin? </span>
                                <button onClick={() => navigate('/login')} className="text-btn">Log in here</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="hero-visual animate-float">
                        <div className="mockup-window glass-panel">
                            <div className="mockup-header">
                                <span className="dot red"></span>
                                <span className="dot yellow"></span>
                                <span className="dot green"></span>
                            </div>
                            <div className="mockup-body">
                                <div className="mockup-chat-bubble received">Hello class! Let's get started.</div>
                                <div className="mockup-chat-bubble sent">I'm ready for today's lesson!</div>
                                <div className="mockup-chat-bubble received">Great. Check out the new achievements.</div>
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
