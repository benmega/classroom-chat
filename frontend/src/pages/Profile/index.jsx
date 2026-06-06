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
