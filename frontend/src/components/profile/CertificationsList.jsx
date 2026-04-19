import React from 'react';
import { Award } from 'lucide-react';

const CertificationsList = ({ certificates }) => {
    if (!certificates || certificates.length === 0) return null;

    return (
        <section className="dashboard-panel">
            <div className="panel-header">
                <h2><Award size={20} /> Certifications</h2>
            </div>
            <div className="cert-list-container">
                <div className="cert-list">
                    {certificates.map(cert => (
                        <div key={cert.id} className="cert-item" onClick={() => cert.file_path && window.open(`/api/achievements/view_certificate/${cert.id}`, '_blank')}>
                            <div className="cert-icon">
                                <div className={`badge badge-${cert.achievement?.slug || 'default'}`}></div>
                            </div>
                            <div className="cert-info">
                                <h4>{cert.achievement?.name || 'Certification'}</h4>
                                <span className="cert-date">{new Date(cert.submitted_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CertificationsList;
