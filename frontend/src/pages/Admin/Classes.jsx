import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Key } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import Skeleton from '../../components/common/Skeleton';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { BulkConnectionCardsModal } from '../../components/admin/AdminModals';
import './Classes.css';

const Classes = () => {
    const navigate = useNavigate();
    const [classrooms, setClassrooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeModal, setActiveModal] = useState(null);
    const [classroomCards, setClassroomCards] = useState([]);
    const [isFetchingCards, setIsFetchingCards] = useState(false);

    const fetchClassrooms = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const response = await client.get('/api/admin/classrooms');
            setClassrooms(response.data.data?.classrooms || response.data.classrooms || []);
        } catch (error) {
            console.error('Error fetching classrooms:', error);
            toast.error('Failed to load classrooms list.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchClassrooms();
    }, [fetchClassrooms]);

    const fetchClassroomCards = async (classroomId) => {
        setIsFetchingCards(true);
        try {
            const response = await client.get(`/api/admin/classrooms/${classroomId}/connection_cards`);
            setClassroomCards(response.data.data?.cards || response.data.cards || []);
            return true;
        } catch (error) {
            console.error('Error fetching cohort connection cards:', error);
            toast.error('Failed to load cohort connection cards.');
            setClassroomCards([]);
            return false;
        } finally {
            setIsFetchingCards(false);
        }
    };

    const filteredClassrooms = classrooms.filter(c => {
        const term = searchTerm.toLowerCase();
        return (
            c.name?.toLowerCase().includes(term) ||
            c.id?.toLowerCase().includes(term) ||
            c.language?.toLowerCase().includes(term)
        );
    });

    // Stats calculations
    const totalClasses = classrooms.length;
    const activeLanguages = Array.from(new Set(classrooms.map(c => c.language).filter(Boolean))).join(', ') || 'None';
    const totalEnrolled = classrooms.reduce((sum, c) => sum + (c.student_count || 0), 0);

    if (isLoading) return (
        <div className="admin-classes-page">
            <header className="page-header">
                <Skeleton height="40px" width="300px" className="skeleton-title" />
                <Skeleton height="20px" width="500px" />
            </header>
            <div className="users-table-container card">
                {[1, 2, 3].map(i => (
                    <div key={i} className="users-skeleton-row">
                        <Skeleton height="60px" />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="admin-classes-page">
            <AdminPageHeader title="Classroom Directory">
                <div className="search-bar">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by name, ID, or language..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="primary-btn bulk-conn-btn" onClick={() => setActiveModal('bulk_connection_cards')}>
                    <Key size={18} /> Print Connection Cards
                </button>
                <button 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={fetchClassrooms}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={18} />
                </button>
            </AdminPageHeader>

            <div className="users-stats-row">
                <div className="stat-mini-card">
                    <span className="label">Total Classrooms</span>
                    <span className="value">{totalClasses}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Total Enrolled</span>
                    <span className="value">{totalEnrolled} Students</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Active Languages</span>
                    <span className="value" className="text-truncate">
                        {activeLanguages}
                    </span>
                </div>
            </div>

            <div className="users-table-container card">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Classroom Name</th>
                            <th>Classroom ID</th>
                            <th>Language</th>
                            <th>Enrolled Students</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClassrooms.length > 0 ? (
                            filteredClassrooms.map(c => (
                                <tr key={c.id}>
                                    <td onClick={() => navigate(`/admin/classes/${c.id}`)} className="cursor-pointer">
                                        <div className="class-name-cell" className="fw-semibold">
                                            {c.name}
                                        </div>
                                    </td>
                                    <td onClick={() => navigate(`/admin/classes/${c.id}`)} className="cursor-pointer">
                                        <span className="class-id-badge" style={{ fontFamily: 'monospace', padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                            {c.id}
                                        </span>
                                    </td>
                                    <td onClick={() => navigate(`/admin/classes/${c.id}`)} className="cursor-pointer">
                                        <span className="language-badge" style={{ padding: '4px 8px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500' }}>
                                            {c.language}
                                        </span>
                                    </td>
                                    <td onClick={() => navigate(`/admin/classes/${c.id}`)} className="cursor-pointer">
                                        <div className="fw-medium">
                                            {c.student_count || 0} Students
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <button 
                                                className="action-btn action-btn-green" 
                                                onClick={async () => {
                                                    await fetchClassroomCards(c.id);
                                                    setActiveModal('bulk_connection_cards');
                                                }}
                                                title="Print Connection Cards"
                                            >
                                                <Key size={14} /> <span className="card-btn-text">Cards</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="empty-row">
                                    No classrooms found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <BulkConnectionCardsModal
                isOpen={activeModal === 'bulk_connection_cards'}
                onClose={() => setActiveModal(null)}
                classrooms={classrooms}
                fetchClassrooms={fetchClassrooms}
                classroomCards={classroomCards}
                setClassroomCards={setClassroomCards}
                isFetchingCards={isFetchingCards}
                fetchClassroomCards={fetchClassroomCards}
            />
        </div>
    );
};

export default Classes;
