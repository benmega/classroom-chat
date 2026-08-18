import React, { useState, useEffect, useCallback } from 'react';
import { Inbox, Trophy, Award, Paperclip, Link2, Clock, Loader2 } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';
import Skeleton from '../../components/common/Skeleton';
import useAuthStore from '../../store/useAuthStore';
import './Activity.css';

const PER_PAGE = 20;

const KIND_ICON = {
    challenge: Trophy,
    certificate: Award,
    file: Paperclip,
    course_request: Link2,
};

const KIND_LABEL = {
    challenge: 'Challenge',
    certificate: 'Certificate',
    file: 'File',
    course_request: 'Course Request',
};

const STATUS_LABEL = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    reviewed: 'Reviewed',
};

const statusClass = (status) => {
    if (status === 'pending') return 'status-pill-pending';
    if (status === 'rejected') return 'status-pill-rejected';
    return 'status-pill-success';
};

const formatDate = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const ActivityItem = ({ item }) => {
    const Icon = KIND_ICON[item.kind] || Inbox;
    const submittedLabel = formatDate(item.submitted_at);

    return (
        <div className="activity-item">
            <div className={`activity-item-icon activity-icon-${item.kind}`}>
                <Icon size={20} />
            </div>
            <div className="activity-item-body">
                <div className="activity-item-top">
                    <span className="activity-item-kind">{KIND_LABEL[item.kind] || item.kind}</span>
                    <h4 className="activity-item-title">{item.title}</h4>
                </div>
                {item.detail && <p className="activity-item-detail">{item.detail}</p>}
                <div className="activity-item-meta">
                    {submittedLabel && (
                        <span className="activity-item-date">
                            <Clock size={12} /> {submittedLabel}
                        </span>
                    )}
                    {item.reward !== null && item.reward !== undefined && (
                        <span className="activity-item-reward">+{item.reward} ducks</span>
                    )}
                </div>
            </div>
            <span className={`status-pill ${statusClass(item.status)}`}>
                {STATUS_LABEL[item.status] || item.status}
            </span>
        </div>
    );
};

const ActivityLoading = () => (
    <div className="activity-page animate-page-entry" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Loader2 size={48} className="animate-spin text-primary" />
    </div>
);

const Activity = () => {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const fetchActivity = useCallback(async (pageToFetch, append) => {
        if (append) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
        }
        try {
            const response = await client.get('/api/me/activity', {
                params: { page: pageToFetch, per_page: PER_PAGE },
            });
            const payload = response.data?.data;
            if (payload) {
                setItems((prev) => (append ? [...prev, ...(payload.items || [])] : (payload.items || [])));
                setTotal(payload.total ?? 0);
                setHasMore(!!payload.has_more);
                setPage(payload.page ?? pageToFetch);
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to load your activity.'));
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchActivity(1, false);
    }, [fetchActivity]);

    useEffect(() => {
        useAuthStore.getState().setActivityUnreadCount(0);
    }, []);

    const handleLoadMore = () => {
        fetchActivity(page + 1, true);
    };

    if (isLoading) {
        return <ActivityLoading />;
    }

    const pendingItems = items.filter((item) => item.status === 'pending');
    const historyItems = items.filter((item) => item.status !== 'pending');

    return (
        <div className="activity-page animate-page-entry">
            {total === 0 ? (
                <div className="activity-empty-state">
                    <Inbox size={48} />
                    <h3>Keep Up the Great Work!</h3>
                    <p>You haven't submitted any activity yet. Start a challenge or request a course to see your history grow!</p>
                </div>
            ) : (
                <>
                    {pendingItems.length > 0 && (
                        <section className="activity-section">
                            <h2 className="activity-section-title">Awaiting Review</h2>
                            <div className="activity-list">
                                {pendingItems.map((item) => (
                                    <ActivityItem key={item.id} item={item} />
                                ))}
                            </div>
                        </section>
                    )}

                    {historyItems.length > 0 && (
                        <section className="activity-section">
                            <h2 className="activity-section-title">History</h2>
                            <div className="activity-list">
                                {historyItems.map((item) => (
                                    <ActivityItem key={item.id} item={item} />
                                ))}
                            </div>
                        </section>
                    )}

                    {hasMore && (
                        <div className="activity-load-more-container">
                            <button
                                type="button"
                                className="activity-load-more-btn"
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? 'Loading...' : 'Load more'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Activity;
