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
                            A space for students to build projects and parents to track progress.
                        </p>
                        
                        <div className="hero-visual animate-float" style={{ margin: '1rem 0' }}>
                            <div className="slideshow-window glass-panel" style={{ width: '100%', maxWidth: '100%', borderRadius: '16px' }}>
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

                        <div className="hero-cta animate-fade-in" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>

                            <button onClick={() => navigate('/signup?role=student')} className="btn-secondary" style={{ width: '100%', padding: '0.8rem' }}>
                                I'm a Student
                            </button>
                            <button onClick={() => navigate('/signup?role=parent')} className="btn-premium btn-premium-lg" style={{ width: '100%' }}>
                                I'm a Parent
                            </button>
                        </div>
                    </div>
                </section>


            </main>

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
        </div>
    );
};

export default LandingMobile;
