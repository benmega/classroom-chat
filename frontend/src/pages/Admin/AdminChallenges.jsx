import React, { useState, useEffect } from 'react';

import { FileUp, Save, Info, Tag, Database, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminChallenges.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Papa from 'papaparse';

const AdminChallenges = () => {

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [courses, setCourses] = useState([]);
    
    const [formData, setFormData] = useState({
        course_id: '',
        domain: 'codecombat.com',
        difficulty: 'medium',
        value: 1
    });

    const [parsedChallenges, setParsedChallenges] = useState([]);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                // We'll fetch course instances to let admin select which course ID to use
                // The API /api/admin/crud/courses should exist based on standard React Admin routes,
                // but if not we can use a simpler approach or fetch course_instances
                const res = await client.get('/api/admin/crud/courseinstances');
                if (res.data && res.data.data) {
                    // Extract unique parent course_ids for simplicity, or just use course_id directly
                    const uniqueCourses = [...new Set(res.data.data.map(ci => ci.course_id))];
                    setCourses(uniqueCourses.filter(Boolean));
                }
            } catch (err) {
                console.error("Failed to fetch courses", err);
            }
        };
        fetchCourses();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setFileName(file.name);
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    // Normalize keys: lowercased, trimmed. Looking for name, slug, description.
                    const challenges = results.data.map(row => {
                        const keys = Object.keys(row);
                        const findKey = (search) => keys.find(k => k.toLowerCase().trim() === search);
                        
                        const nameKey = findKey('name');
                        const slugKey = findKey('slug');
                        const descKey = findKey('description');
                        const seqKey = findKey('sequence');

                        return {
                            name: nameKey ? row[nameKey] : '',
                            slug: slugKey ? row[slugKey] : '',
                            description: descKey ? row[descKey] : '',
                            sequence: seqKey && row[seqKey] ? parseInt(row[seqKey], 10) : null
                        };
                    }).filter(c => c.name && c.slug);
                    
                    setParsedChallenges(challenges);
                    
                } else {
                    toast.error("No valid data found in CSV");
                }
            },
            error: (error) => {
                toast.error("Error parsing CSV file");
                console.error(error);
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (parsedChallenges.length === 0) {
            toast.error("Please upload a CSV file with valid challenge data.");
            return;
        }

        if (!formData.course_id) {
            toast.error("Please select a Course ID or enter one.");
            return;
        }

        setIsSubmitting(true);

        const payload = {
            course_id: formData.course_id,
            domain: formData.domain,
            difficulty: formData.difficulty,
            value: Number(formData.value),
            challenges: parsedChallenges
        };

        try {
            const response = await client.post('/api/admin/challenges/bulk_add', payload);
            if (response.data) {
                
                // Reset form
                setParsedChallenges([]);
                setFileName('');
            }
        } catch (error) {
            console.error('Bulk add error:', error);
            toast.error(error.response?.data?.message || 'Failed to add challenges.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const [activeTab, setActiveTab] = useState('bulk'); // 'bulk' or 'list'
    const [listCourseId, setListCourseId] = useState('');
    const [listDomain, setListDomain] = useState('codecombat.com');
    const [challengesList, setChallengesList] = useState([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const fetchChallenges = async () => {
        if (!listCourseId) {
            toast.error("Please enter a Course ID to fetch.");
            return;
        }
        setIsLoadingList(true);
        try {
            const response = await client.get(`/api/admin/challenges/${listCourseId}?domain=${listDomain}`);
            if (response.data && response.data.challenges) {
                setChallengesList(response.data.challenges);
                if (response.data.challenges.length === 0) {
                    toast.error("No challenges found for this course and domain.");
                // eslint-disable-next-line
                } else {
                    
                }
            }
        } catch (error) {
            console.error('Fetch challenges error:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch challenges.');
        } finally {
            setIsLoadingList(false);
        }
    };

    const handleMoveUp = (index) => {
        if (index === 0) return;
        const newList = [...challengesList];
        const temp = newList[index - 1];
        newList[index - 1] = newList[index];
        newList[index] = temp;
        setChallengesList(newList);
    };

    const handleMoveDown = (index) => {
        if (index === challengesList.length - 1) return;
        const newList = [...challengesList];
        const temp = newList[index + 1];
        newList[index + 1] = newList[index];
        newList[index] = temp;
        setChallengesList(newList);
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        // Create updates array matching the new array order
        const updates = challengesList.map((chal, index) => ({
            id: chal.id,
            sequence: index + 1 // Ensure 1-based sequential ordering based on array position
        }));

        try {
            const response = await client.put('/api/admin/challenges/reorder', { updates });
            if (response.data) {
                
                // Re-fetch to reflect saved sequences from backend
                await fetchChallenges();
            }
        } catch (error) {
            console.error('Save order error:', error);
            toast.error(error.response?.data?.message || 'Failed to save order.');
        } finally {
            setIsSavingOrder(false);
        }
    };

    return (
        <div className="admin-challenges-page">
            <AdminPageHeader 
                title="Manage Challenge Sets" 
            />

            <div className="challenges-tabs d-flex gap-md mb-1rem">
                <button 
                    className={`btn ${activeTab === 'bulk' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('bulk')}
                >
                    Bulk Import
                </button>
                <button 
                    className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('list')}
                >
                    Manage List
                </button>
            </div>

            <div className="challenges-form-container card">
                {activeTab === 'bulk' && (
                    <>
                        <form onSubmit={handleSubmit} className="challenges-form">
                            <div className="form-section">
                                <h3 className="section-title"><Tag size={18} /> Default Configuration</h3>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="input-140">Target Course ID *</label>
                                        <input id="input-140" 
                                            type="text" 
                                            name="course_id" 
                                            value={formData.course_id} 
                                            onChange={handleInputChange} 
                                            required 
                                            placeholder="e.g. comp-sci-101"
                                            list="course-list"
                                        />
                                        <datalist id="course-list">
                                            {courses.map(course => (
                                                <option key={course} value={course} />
                                            ))}
                                        </datalist>
                                        <small className="hint">The parent course ID these challenges belong to.</small>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="input-159">Domain *</label>
                                        <select id="input-159" name="domain" value={formData.domain} onChange={handleInputChange} required>
                                            <option value="codecombat.com">CodeCombat (codecombat.com)</option>
                                            <option value="studio.code.org">Code.org (studio.code.org)</option>
                                            <option value="ozaria.com">Ozaria (ozaria.com)</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="input-171">Difficulty Level</label>
                                        <select id="input-171" name="difficulty" value={formData.difficulty} onChange={handleInputChange}>
                                            <option value="easy">Easy (0.5x multiplier)</option>
                                            <option value="medium">Medium (1x multiplier)</option>
                                            <option value="hard">Hard (2x multiplier)</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="input-180">Base Duck Value</label>
                                        <input id="input-180" 
                                            type="number" 
                                            name="value" 
                                            value={formData.value} 
                                            onChange={handleInputChange} 
                                            min="1"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title"><Database size={18} /> Upload CSV Set</h3>
                                
                                <div className="form-group">
                                    <label htmlFor="csv-upload">Challenge CSV File *</label>
                                    <div className="file-upload-wrapper">
                                        <input 
                                            type="file" 
                                            accept=".csv" 
                                            onChange={handleFileUpload}
                                            id="csv-upload"
                                            className="file-input"
                                        />
                                        <label htmlFor="csv-upload" className="file-label">
                                            <FileUp size={24} /> 
                                            {fileName ? fileName : 'Click to select CSV file...'}
                                        </label>
                                    </div>
                                    <small className="hint">File should contain headers: <code>Name, Slug, Description, Sequence</code>.</small>
                                </div>
                            </div>

                            <footer className="form-footer">
                                <button 
                                    type="submit" 
                                    className="btn-submit" 
                                    disabled={isSubmitting || parsedChallenges.length === 0}
                                >
                                    <Save size={20} /> {isSubmitting ? 'Processing...' : 'Bulk Create Challenges'}
                                </button>
                            </footer>
                        </form>

                        <aside className="challenges-preview-panel">
                            <h3><Activity size={20} /> Import Summary</h3>
                            
                            <div className="preview-stats">
                                <div className="stat-item">
                                    <span className="stat-label">File Status</span>
                                    <span className="stat-value">
                                        {fileName ? (
                                            <span className="stat-status-loaded">
                                                <CheckCircle size={16} /> Loaded
                                            </span>
                                        ) : (
                                            <span className="stat-status-waiting">Waiting...</span>
                                        )}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Valid Rows Found</span>
                                    <span className="stat-value">{parsedChallenges.length}</span>
                                </div>
                                
                                {parsedChallenges.length > 0 && (
                                    <div className="stat-item stat-item-column">
                                        <span className="stat-label">Preview (First 3):</span>
                                        <ul className="stat-preview-list">
                                            {parsedChallenges.slice(0, 3).map((c, i) => (
                                                <li key={i}><strong>{c.name}</strong> ({c.slug})</li>
                                            ))}
                                            {parsedChallenges.length > 3 && <li>...and {parsedChallenges.length - 3} more</li>}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            
                            <div className="pro-tip">
                                <Info size={16} className="pro-tip-icon" />
                                <p>If a challenge slug already exists in the database, it will be skipped during the import process to prevent duplicates.</p>
                            </div>
                        </aside>
                    </>
                )}

                {activeTab === 'list' && (
                    <div className="manage-list-tab" style={{ padding: '1rem', width: '100%' }}>
                        <div className="d-flex gap-md align-center mb-1rem flex-wrap">
                            <div className="form-group flex-1 min-w-200px">
                                <label htmlFor="listCourseId">Target Course ID</label>
                                <input 
                                    id="listCourseId"
                                    type="text" 
                                    value={listCourseId} 
                                    onChange={(e) => setListCourseId(e.target.value)} 
                                    placeholder="e.g. comp-sci-101"
                                    list="course-list-2"
                                />
                                <datalist id="course-list-2">
                                    {courses.map(course => (
                                        <option key={course} value={course} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="form-group flex-1 min-w-200px">
                                <label htmlFor="listDomain">Domain</label>
                                <select id="listDomain" value={listDomain} onChange={(e) => setListDomain(e.target.value)}>
                                    <option value="codecombat.com">CodeCombat (codecombat.com)</option>
                                    <option value="studio.code.org">Code.org (studio.code.org)</option>
                                    <option value="ozaria.com">Ozaria (ozaria.com)</option>
                                </select>
                            </div>
                            <div className="d-flex align-end" style={{ paddingBottom: '0.25rem' }}>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={fetchChallenges}
                                    disabled={isLoadingList}
                                >
                                    {isLoadingList ? 'Loading...' : 'Fetch Challenges'}
                                </button>
                            </div>
                        </div>

                        {challengesList.length > 0 && (
                            <div className="challenges-list-view">
                                <table className="admin-table w-100 mb-1rem">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '60px' }}>Order</th>
                                            <th>Name</th>
                                            <th>Slug</th>
                                            <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {challengesList.map((chal, index) => (
                                            <tr key={chal.id}>
                                                <td className="text-center font-bold text-muted">{index + 1}</td>
                                                <td>{chal.name}</td>
                                                <td><code className="text-xs">{chal.slug}</code></td>
                                                <td>
                                                    <div className="d-flex justify-center gap-sm">
                                                        <button 
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => handleMoveUp(index)}
                                                            disabled={index === 0}
                                                            title="Move Up"
                                                        >
                                                            ↑
                                                        </button>
                                                        <button 
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => handleMoveDown(index)}
                                                            disabled={index === challengesList.length - 1}
                                                            title="Move Down"
                                                        >
                                                            ↓
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                <div className="d-flex justify-end">
                                    <button 
                                        className="btn btn-success d-flex align-center gap-sm"
                                        onClick={handleSaveOrder}
                                        disabled={isSavingOrder}
                                    >
                                        <Save size={18} />
                                        {isSavingOrder ? 'Saving...' : 'Save New Order'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChallenges;
