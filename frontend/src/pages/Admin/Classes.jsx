import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Key, Plus, School, Users, Globe, BookOpen, X } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import Skeleton from '../../components/common/Skeleton';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { BulkConnectionCardsModal } from '../../components/admin/AdminModals';
import './Classes.css';

const LanguageSymbol = ({ language }) => {
    const lang = (language || '').toLowerCase();
    if (lang.includes('python')) {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#3776AB" d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23-.02-1.43v-2l.02-1.43.05-1.24.14-1.06.21-.89.28-.73.32-.59.35-.46.36-.36.36-.26.35-.18.32-.12.28-.07.21-.03h3.06v-3.06l.02-.21.04-.27.07-.32.1-.35.15-.37.2-.36.27-.35-.33-.32.41-.27.5-.22.59-.14.69-.05h5.45zM12.03 1.54a1.47 1.47 0 1 0 0 2.94 1.47 1.47 0 0 0 0-2.94z" />
                <path fill="#FFD43B" d="M9.75 23.82l-.9-.2-.73-.26-.59-.3-.45-.32-.34-.34-.25-.34-.16-.33-.1-.3-.04-.26-.02-.2.01-.13V15.5l.05-.63.13-.55.21-.46.26-.38.3-.31.33-.25.35-.19.35-.14.33-.1.3-.07.26-.04.21-.02h5.45l.69-.05.59-.14.5-.22.41-.27.33-.32.27-.35.2-.36.15-.37.1-.35.07-.32.04-.27.02-.21v-3.06h3.06l.21.03.28.07.32.12.35.18.36.26.36.36.35.46.32.59.28.73.21.88.14 1.05.05 1.23.02 1.43v2l-.02 1.43-.05 1.24-.14 1.06-.21.89-.28.73-.32.59-.35.46-.36.36-.36.26-.35.18-.32.12-.28.07-.21.03h-3.06v3.06l-.02.21-.04.27-.07.32-.1.35-.15.37-.2.36-.27.35-.33.32-.41.27-.5.22-.59.14-.69.05h-5.45zM11.97 19.52a1.47 1.47 0 1 0 0 2.94 1.47 1.47 0 0 0 0-2.94z" />
            </svg>
        );
    }
    if (lang.includes('javascript') || lang.includes('js')) {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#F7DF1E" d="M0 0h24v24H0V0z" />
                <path fill="#000000" d="M22.012 18.2c-.136 1.451-1.359 4.161-5.12 4.161-2.969 0-5.118-1.503-6.046-3.136l2.956-1.921c.642 1.038 1.705 1.93 3.01 1.93 1.216 0 2.062-.518 2.062-1.396 0-.961-.716-1.35-2.616-2.094-2.836-.983-5.221-2.327-5.221-5.385 0-3.048 2.37-5.32 5.568-5.32 2.658 0 4.609 1.26 5.516 3.167l-2.733 1.789c-.662-1.127-1.533-1.782-2.775-1.782-1.2 0-1.879.626-1.879 1.341 0 .97.808 1.282 2.709 1.966 3.125 1.134 4.707 2.614 4.569 5.38zM11.746 16.969C11.746 20.354 10.372 22.36 6.84 22.36 4.39 22.36 2.32 21.05 1.34 19.16l2.813-1.802c.575 1.01 1.554 1.761 2.766 1.761 1.053 0 1.942-.518 1.942-2.12V5.05h3.18v11.919z" />
            </svg>
        );
    }
    if (lang.includes('c++') || lang.includes('cpp')) {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#00599C" d="M22.25 4.34a2 2 0 0 0-1-1.74l-8.25-4.76a2 2 0 0 0-2 0L2.75 2.6a2 2 0 0 0-1 1.74v9.52a2 2 0 0 0 1 1.74l8.25 4.76a2 2 0 0 0 2 0l8.25-4.76a2 2 0 0 0 1-1.74zm-8.8 8.16h-1.5v1.5h-1.24v-1.5h-1.5v-1.24h1.5v-1.5h1.24v1.5h1.5zm-5.74-3h1.24v1.5h1.5v1.24h-1.5v1.5H7.71v-1.5h-1.5v-1.24h1.5z" />
                <path fill="#004482" d="M2.75 12.12v9.28a2 2 0 0 0 1 1.74l8.25 4.76a2 2 0 0 0 2 0l8.25-4.76a2 2 0 0 0 1-1.74v-9.28l-10.25 5.91zM13.45 12.5h-1.24v1.5h-1.5v-1.24h-1.5v-1.5h1.5v-1.24h1.24v1.24h1.5z" />
                <path fill="#FFF" d="M12.92 11.26a4.23 4.23 0 0 0-3.32-3.35 4.19 4.19 0 0 0-4.8 2.76A4.2 4.2 0 0 0 7.55 15a4.23 4.23 0 0 0 3.32 3.35 4.19 4.19 0 0 0 4.8-2.76l-1.3-.46a2.82 2.82 0 0 1-3.23 1.83 2.8 2.8 0 0 1-1.84-1.84 2.82 2.82 0 0 1 1.83-3.23 2.8 2.8 0 0 1 3.23 1.84z" />
            </svg>
        );
    }
    // Fallback Code icon
    return <Globe size={18} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />;
};

const Classes = () => {
    const navigate = useNavigate();
    const [classrooms, setClassrooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeModal, setActiveModal] = useState(null);
    const [classroomCards, setClassroomCards] = useState([]);
    const [isFetchingCards, setIsFetchingCards] = useState(false);

    // Create Classroom Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newId, setNewId] = useState('');
    const [newName, setNewName] = useState('');
    const [newLanguage, setNewLanguage] = useState('Python');
    const [newUrl, setNewUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleCreateClassroom = async (e) => {
        e.preventDefault();
        if (!newId.trim() || !newName.trim() || !newLanguage.trim()) {
            toast.error('Classroom ID, Name, and Language are required.');
            return;
        }

        setIsSubmitting(true);
        try {
            await client.post('/api/admin/crud/classroom', {
                id: newId.trim(),
                name: newName.trim(),
                language: newLanguage.trim(),
                url: newUrl.trim() || 'https://classroom.chat'
            });
            toast.success(`Classroom "${newName}" created successfully!`);
            setIsCreateModalOpen(false);
            setNewId('');
            setNewName('');
            setNewLanguage('Python');
            setNewUrl('');
            fetchClassrooms();
        } catch (error) {
            console.error('Failed to create classroom:', error);
            toast.error(error.response?.data?.error || 'Failed to create classroom.');
        } finally {
            setIsSubmitting(false);
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

    // Statistics calculations
    const totalClassrooms = classrooms.length;

    if (isLoading) return (
        <div className="admin-classes-page">
            <header className="page-header">
                <Skeleton height="40px" width="300px" className="skeleton-title" />
                <Skeleton height="20px" width="500px" />
            </header>
            <div className="classes-grid-container">
                <div className="classes-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="class-card" style={{ padding: 0 }}>
                            <Skeleton height="100px" borderRadius="12px 12px 0 0" />
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <Skeleton height="20px" width="60%" />
                                <Skeleton height="20px" width="40%" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="admin-classes-page">
            <AdminPageHeader title="Classroom Directory">
                <div className="search-bar">
                    <Search size={18} aria-hidden="true" />
                    <label htmlFor="classroom-search" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
                        Search classrooms by name, ID, or language
                    </label>
                    <input
                        type="text"
                        id="classroom-search"
                        aria-label="Search classrooms by name, ID, or language"
                        placeholder="Search by name, ID, or language..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="header-actions-group">
                    <button
                        className="primary-btn"
                        onClick={() => setIsCreateModalOpen(true)}
                        aria-label="Add new classroom"
                    >
                        <Plus size={18} aria-hidden="true" /> Add Classroom
                    </button>
                    <button
                        className="primary-btn bulk-conn-btn"
                        onClick={() => setActiveModal('bulk_connection_cards')}
                        aria-label="Print connection cards for all classrooms"
                    >
                        <Key size={18} aria-hidden="true" /> Connection Cards
                    </button>
                    <button
                        className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={fetchClassrooms}
                        disabled={isRefreshing}
                        aria-label="Refresh classroom list"
                    >
                        <RefreshCw size={18} aria-hidden="true" />
                    </button>
                </div>
            </AdminPageHeader>

            {/* Grid Container */}
            <div className="classes-grid-container">

                {filteredClassrooms.length > 0 ? (
                    <div className="classes-grid" aria-label="Classroom Directory Grid">
                        {filteredClassrooms.map(c => (
                            <div 
                                className="class-card" 
                                key={c.id}
                                onClick={() => navigate(`/admin/classes/${c.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        if (e.target === e.currentTarget) {
                                            navigate(`/admin/classes/${c.id}`);
                                        }
                                    }
                                }}
                            >
                                <div className="class-card-header">
                                    <Link
                                        to={`/admin/classes/${c.id}`}
                                        className="class-card-title-link"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label={`Manage classroom ${c.name}`}
                                    >
                                        {c.name}
                                    </Link>
                                </div>
                                <div className="class-card-body">
                                    <div className="class-card-detail" title={c.language || 'Language'}>
                                        <LanguageSymbol language={c.language} />
                                    </div>
                                    <div className="class-card-detail" title={`${c.student_count || 0} Students`}>
                                        <Users size={18} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                                        <span>{c.student_count || 0}</span>
                                    </div>
                                </div>
                                <div className="class-card-actions">
                                    <button
                                        className="secondary-btn"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 12px' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fetchClassroomCards(c.id);
                                            setActiveModal('bulk_connection_cards');
                                        }}
                                        title={`Print Connection Cards for ${c.name}`}
                                        aria-label={`Print Connection Cards for ${c.name}`}
                                    >
                                        <Key size={14} aria-hidden="true" /> Cards
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                        No classrooms found matching your search.
                    </div>
                )}
            </div>

            {/* Create Classroom Modal */}
            {isCreateModalOpen && (
                <div className="modal-overlay" role="dialog" aria-labelledby="modal-title-create-classroom" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3 id="modal-title-create-classroom">Create New Classroom</h3>
                            <button
                                type="button"
                                className="close-btn"
                                onClick={() => setIsCreateModalOpen(false)}
                                aria-label="Close modal"
                            >
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateClassroom} className="modal-form">
                            <div className="form-group">
                                <label htmlFor="new-class-id">Classroom ID (Unique Identifier)</label>
                                <input
                                    type="text"
                                    id="new-class-id"
                                    value={newId}
                                    onChange={(e) => setNewId(e.target.value)}
                                    placeholder="e.g. PY101_SPRING"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="new-class-name">Classroom Name</label>
                                <input
                                    type="text"
                                    id="new-class-name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Python Beginners 101"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="new-class-lang">Language</label>
                                <input
                                    type="text"
                                    id="new-class-lang"
                                    value={newLanguage}
                                    onChange={(e) => setNewLanguage(e.target.value)}
                                    placeholder="e.g. Python, Scratch, JavaScript"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="new-class-url">Web App / Project URL (Optional)</label>
                                <input
                                    type="url"
                                    id="new-class-url"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="primary-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Classroom'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
