import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import SubmitChallenge from './SubmitChallenge';
import SubmitFile from './SubmitFile';
import JoinClassroom from './JoinClassroom';
import client from '../../api/client';
import './SubmitWork.css';

const SubmitWork = () => {
    const [classrooms, setClassrooms] = useState(null); // null = loading
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        client.get('/api/classroom/mine')
            .then(res => {
                const list = res.data?.data?.classrooms || res.data?.classrooms || [];
                setClassrooms(list);
            })
            .catch(() => {
                // Status is genuinely unknown (network blip, etc.) — don't guess
                // either way, just skip the classroom prompt for this visit.
                setLoadFailed(true);
                setClassrooms([]);
            });
    }, []);

    const isLoading = classrooms === null;
    const hasClassroom = !isLoading && classrooms.length > 0;

    const handleJoined = (classroom) => {
        setClassrooms((prev) => [...(prev || []), classroom]);
    };

    return (
        <div className="submit-work-page animate-page-entry">
            <Link to="/activity" className="submit-work-activity-link">
                <History size={14} /> View your submission history &rarr;
            </Link>

            {isLoading ? (
                <div className="join-classroom-skeleton" aria-hidden="true" />
            ) : (
                !loadFailed && <JoinClassroom compact={hasClassroom} onJoined={handleJoined} />
            )}

            <SubmitChallenge />
            <SubmitFile />
        </div>
    );
};

export default SubmitWork;
