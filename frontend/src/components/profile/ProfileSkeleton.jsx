import React from 'react';
import Skeleton, { SkeletonGroup } from '../common/Skeleton';

const ProfileSkeleton = () => {
    return (
        <SkeletonGroup 
            label="Loading Profile..." 
            className="profile-page" 
            data-testid="profile-skeleton"
        >
            <div className="profile-header-card">
                <Skeleton 
                    className="header-background" 
                    style={{ background: 'var(--bg-tertiary)', border: 'none' }} 
                />
                <div className="profile-header-content">
                    <div className="avatar-wrapper" style={{ cursor: 'default' }}>
                        <Skeleton width="100%" height="100%" borderRadius="50%" />
                    </div>

                    <div className="student-identity">
                        <Skeleton height="32px" width="220px" style={{ marginBottom: '8px' }} />
                        <Skeleton height="18px" width="120px" style={{ marginBottom: '14px' }} />
                        <div className="profile-header-actions">
                            <Skeleton height="32px" width="110px" borderRadius="var(--radius-sm)" />
                        </div>
                    </div>

                    <div className="header-stats">
                        <div className="stat-box">
                            <Skeleton height="12px" width="48px" style={{ marginBottom: '6px' }} />
                            <Skeleton height="22px" width="32px" />
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-box">
                            <Skeleton height="12px" width="48px" style={{ marginBottom: '6px' }} />
                            <Skeleton height="22px" width="32px" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="column-left">
                    <section className="dashboard-panel bio-section">
                        <div className="panel-header between">
                            <Skeleton height="22px" width="110px" />
                        </div>
                        <div className="bio-panel-content">
                            <Skeleton height="14px" style={{ marginBottom: '8px' }} />
                            <Skeleton height="14px" width="90%" style={{ marginBottom: '8px' }} />
                            <Skeleton height="14px" width="60%" />
                        </div>
                    </section>

                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <Skeleton height="22px" width="150px" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Skeleton height="48px" borderRadius="var(--radius-sm)" />
                            <Skeleton height="48px" borderRadius="var(--radius-sm)" />
                            <Skeleton height="48px" borderRadius="var(--radius-sm)" />
                        </div>
                    </section>

                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <Skeleton height="22px" width="130px" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Skeleton height="40px" width="40px" borderRadius="8px" style={{ flexShrink: 0 }} />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <Skeleton height="16px" width="70%" />
                                    <Skeleton height="12px" width="40%" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Skeleton height="40px" width="40px" borderRadius="8px" style={{ flexShrink: 0 }} />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <Skeleton height="16px" width="60%" />
                                    <Skeleton height="12px" width="35%" />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <Skeleton height="22px" width="125px" />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <Skeleton height="28px" width="75px" borderRadius="14px" />
                            <Skeleton height="28px" width="90px" borderRadius="14px" />
                            <Skeleton height="28px" width="65px" borderRadius="14px" />
                            <Skeleton height="28px" width="80px" borderRadius="14px" />
                        </div>
                    </section>
                </div>

                <div className="column-right">
                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <Skeleton height="22px" width="160px" />
                        </div>
                        <div className="projects-grid">
                            {[1, 2].map((i) => (
                                <div key={i} className="project-card">
                                    <div className="project-thumb">
                                        <Skeleton height="100%" width="100%" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <Skeleton height="18px" width="70%" />
                                        <Skeleton height="14px" width="100%" />
                                        <Skeleton height="14px" width="85%" />
                                        <Skeleton height="14px" width="45%" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <Skeleton height="22px" width="150px" />
                        </div>
                        <Skeleton height="140px" borderRadius="var(--radius-sm)" />
                    </section>

                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <Skeleton height="22px" width="150px" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                            <Skeleton height="110px" borderRadius="var(--radius-sm)" />
                            <Skeleton height="110px" borderRadius="var(--radius-sm)" />
                            <Skeleton height="110px" borderRadius="var(--radius-sm)" />
                        </div>
                    </section>
                </div>
            </div>
        </SkeletonGroup>
    );
};

export default ProfileSkeleton;
