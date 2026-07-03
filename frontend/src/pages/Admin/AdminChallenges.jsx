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

                        return {
                            name: nameKey ? row[nameKey] : '',
                            slug: slugKey ? row[slugKey] : '',
                            description: descKey ? row[descKey] : ''
                        };
                    }).filter(c => c.name && c.slug);
                    
                    setParsedChallenges(challenges);
                    toast.success(`Parsed ${challenges.length} challenges from CSV`);
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
                toast.success(response.data.message || `Successfully added challenges.`);
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

    return (
        <div className="admin-challenges-page">
            <AdminPageHeader 
                title="Add Challenge Sets" 
            />

            <div className="challenges-form-container card">
                <form onSubmit={handleSubmit} className="challenges-form">
                    <div className="form-section">
                        <h3 className="section-title"><Tag size={18} /> Default Configuration</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Target Course ID *</label>
                                <input 
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
                                <label>Domain *</label>
                                <select name="domain" value={formData.domain} onChange={handleInputChange} required>
                                    <option value="codecombat.com">CodeCombat (codecombat.com)</option>
                                    <option value="studio.code.org">Code.org (studio.code.org)</option>
                                    <option value="ozaria.com">Ozaria (ozaria.com)</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Difficulty Level</label>
                                <select name="difficulty" value={formData.difficulty} onChange={handleInputChange}>
                                    <option value="easy">Easy (0.5x multiplier)</option>
                                    <option value="medium">Medium (1x multiplier)</option>
                                    <option value="hard">Hard (2x multiplier)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Base Duck Value</label>
                                <input 
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
                            <label>Challenge CSV File *</label>
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
                            <small className="hint">File should contain headers: <code>Name, Slug, Description</code>.</small>
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
            </div>
        </div>
    );
};

export default AdminChallenges;
