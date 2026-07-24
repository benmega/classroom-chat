import React, { useState, useEffect } from 'react';
import SubmitChallenge from './SubmitChallenge';
import JoinClassroom from './JoinClassroom';
import client from '../../api/client';

const SubmitWork = () => {
    const [classrooms, setClassrooms] = useState(null); // null = loading
    const [hasClassroom, setHasClassroom] = useState(false);

    useEffect(() => {
        client.get('/api/classroom/mine')
            .then(res => {
                const list = res.data?.data?.classrooms || res.data?.classrooms || [];
                setClassrooms(list);
                setHasClassroom(list.length > 0);
            })
            .catch(() => {
                // If the endpoint fails (e.g., user is not a student), hide the widget quietly
                setClassrooms([]);
                setHasClassroom(true); // don't show the prominent form on errors
            });
    }, []);

    const handleJoined = () => {
        setHasClassroom(true);
    };

    return (
        <div className="submit-work-page animate-page-entry">
            <SubmitChallenge />

            {/* ── Classroom join section ───────────────────────────────── */}
            {/* Only render once we know the student's classroom status */}
            {classrooms !== null && (
                <JoinClassroom
                    compact={hasClassroom}
                    onJoined={handleJoined}
                />
            )}
        </div>
    );
};

export default SubmitWork;
