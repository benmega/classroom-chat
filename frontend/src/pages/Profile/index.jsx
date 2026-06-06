import React from 'react';
import { User } from 'lucide-react';
import './Profile.css';
import '../../assets/css/sprite.css'; 
import useAuthStore from '../../store/useAuthStore'; 
import ContributionGraph from '../../components/profile/ContributionGraph';

// New sub-components
import ProfileHeader from '../../components/profile/ProfileHeader';
import CourseProgress from '../../components/profile/CourseProgress';
import CertificationsList from '../../components/profile/CertificationsList';
import AchievementsList from '../../components/profile/AchievementsList';
import TechnicalSkills from '../../components/profile/TechnicalSkills';
import ProjectPortfolio from '../../components/profile/ProjectPortfolio';
import DigitalNotebook from '../../components/profile/DigitalNotebook';
import ProjectModal from '../../components/profile/ProjectModal';
import NoteSlideshow from '../../components/profile/NoteSlideshow';
import PfpCropModal from '../../components/profile/PfpCropModal';

// Hooks
import { useProfile } from '../../hooks/useProfile';

const Profile = () => {
    const {
        profileData,
        isLoading,
        selectedProject,
        setSelectedProject,
        slideshowIndex,
        setSlideshowIndex,
        isCropping,
        setIsCropping,
        cropImage,
        isUploadingPic,
        fileInputRef,
        cameraInputRef,
        pfpInputRef,
        cropImgRef,
        isOwner,
        handleDeleteNote,
        handleFileUpload,
        handlePfpChange,
        handleSaveCrop
    } = useProfile();

    const { hamburgerProgress, setHamburgerProgress } = useAuthStore();

    if (isLoading) return <div className="profile-loading">Loading Profile...</div>;
    if (!profileData) return <div className="profile-error">Profile not found.</div>;

    const { target } = profileData;

    return (
        <>
        <div className="profile-page">
            <ProfileHeader 
                target={target} 
                isOwner={isOwner} 
                pfpInputRef={pfpInputRef}
                onPfpChange={handlePfpChange}
            />

            <div className="dashboard-grid">
                <div className="column-left">
                    {(target.bio || isOwner) ? (
                        <section className="dashboard-panel bio-section">
                            <div className="panel-header">
                                <h2><User size={20} /> About Me</h2>
                            </div>
                            <div className="bio-panel-content">
                                {target.bio ? (
                                    <p className="bio-text">{target.bio}</p>
                                ) : (
                                    <p className="bio-placeholder">
                                        {isOwner 
                                            ? "You haven't added a biography yet. Click 'Edit Profile' to tell your classmates about yourself!" 
                                            : "This student hasn't shared a biography yet."}
                                    </p>
                                )}
                            </div>
                        </section>
                    ) : null}

                    {isOwner && (
                        <section className="dashboard-panel interface-explorer-section">
                            <div className="panel-header">
                                <h2><User size={20} /> Interface Explorer</h2>
                            </div>
                            <div className="panel-content explorer-content">
                                <p className="explorer-desc">
                                    Did you know the menu icon ☰ is called a <strong>Hamburger Menu</strong> because it looks like a real hamburger 🍔? Play with the slider below to watch the hamburger morph in real-time!
                                </p>
                                <div className="interactive-morph-control">
                                    <div className="morph-slider-labels">
                                        <span className="label-hamburger">🍔 Hamburger</span>
                                        <span className="label-separator">─────</span>
                                        <span className="label-menu">3-Line Menu ☰</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.01" 
                                        value={hamburgerProgress} 
                                        onChange={(e) => setHamburgerProgress(parseFloat(e.target.value))}
                                        className="morph-slider"
                                        aria-label="Hamburger morph slider"
                                    />
                                    <div className="morph-slider-status">
                                        Morphed Stage: <strong>{Math.round(hamburgerProgress * 100)}%</strong>
                                    </div>
                                </div>
                                <div className="interface-db-status">
                                    <div className="status-metric">
                                        Completed Challenges: <strong>{target.completed_challenges_count ?? 0}</strong>
                                    </div>
                                    <div className="status-metric">
                                        Active Menu Style: <strong>{target.completed_challenges_count >= 10 ? "3-Line Menu ☰" : target.completed_challenges_count === 0 ? "Literal Hamburger 🍔" : "Hybrid Morph State"}</strong>
                                    </div>
                                    {localStorage.getItem(`hamburger_override_${target.username}`) !== null && (
                                        <button 
                                            onClick={() => {
                                                localStorage.removeItem(`hamburger_override_${target.username}`);
                                                const completed = target.completed_challenges_count ?? 0;
                                                setHamburgerProgress(Math.min(completed / 10, 1.0));
                                            }}
                                            className="reset-override-btn"
                                        >
                                            Reset to database progress
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    <CourseProgress target={target} />
                    
                    <CertificationsList certificates={target.certificates} />

                    <AchievementsList achievements={target.achievements} />

                    <TechnicalSkills skills={target.skills} />
                </div>

                <div className="column-right">
                    <ProjectPortfolio 
                        projects={target.projects} 
                        isOwner={isOwner} 
                        setSelectedProject={setSelectedProject}
                    />

                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <h2><User size={20} /> Coding Activity</h2>
                        </div>
                        <div className="activity-visual">
                            <ContributionGraph data={target.contribution_data} />
                        </div>
                    </section>

                    <DigitalNotebook 
                        notes={target.notes}
                        isOwner={isOwner}
                        onFileUpload={handleFileUpload}
                        onDeleteNote={handleDeleteNote}
                        setSlideshowIndex={setSlideshowIndex}
                        fileInputRef={fileInputRef}
                        cameraInputRef={cameraInputRef}
                    />
                </div>
            </div>
        </div>

            <ProjectModal 
                project={selectedProject} 
                onClose={() => setSelectedProject(null)} 
            />

            <NoteSlideshow 
                notes={target.notes}
                currentIndex={slideshowIndex}
                onClose={() => setSlideshowIndex(null)}
                onPrev={() => setSlideshowIndex(i => i > 0 ? i - 1 : target.notes.length - 1)}
                onNext={() => setSlideshowIndex(i => i < target.notes.length - 1 ? i + 1 : 0)}
            />

            <PfpCropModal 
                isCropping={isCropping}
                cropImgRef={cropImgRef}
                cropImage={cropImage}
                isUploadingPic={isUploadingPic}
                onCancel={() => setIsCropping(false)}
                onSave={handleSaveCrop}
            />
        </>
    );
};

export default Profile;
