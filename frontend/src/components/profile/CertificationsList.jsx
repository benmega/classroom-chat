import React from 'react';
import { Award, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../../utils/apiUrl';
import { safeDate } from '../../utils/formatters';

const CertificationsList = ({ certificates }) => {
    if (!certificates || certificates.length === 0) return null;

    return (
        <section className="dashboard-panel">
            <div className="panel-header d-flex justify-between align-center">
                <h2><Award size={20} /> Certifications</h2>
                <Link to="/submit-work#certificate" title="Submit Certificate" className="text-secondary d-flex align-center">
                    <Plus size={20} />
                </Link>
            </div>
            <div className="cert-list-container">
                <div className="cert-list">
                    {certificates.map(cert => {
                        const submittedDate = safeDate(cert.submitted_at, { month: 'short', year: 'numeric' });
                        const content = (
                            <>
                                <div className="cert-icon">
                                    <div className={`badge badge-${cert.achievement?.slug || 'default'}`}></div>
                                </div>
                                <div className="cert-info">
                                    <h4>{cert.achievement?.name || 'Certification'}</h4>
                                    {submittedDate && <span className="cert-date">{submittedDate}</span>}
                                </div>
                            </>
                        );
                        // Only a certificate with a file can be opened: that one is a real link, the rest are plain items.
                        return cert.file_path ? (
                            <a
                                key={cert.id}
                                href={getApiUrl(`/api/achievements/view_certificate/${cert.id}`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cert-item"
                            >
                                {content}
                            </a>
                        ) : (
                            <div key={cert.id} className="cert-item">
                                {content}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default CertificationsList;
