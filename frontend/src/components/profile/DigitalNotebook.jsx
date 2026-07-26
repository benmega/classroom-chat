import React, { useState } from 'react';
import { StickyNote, Camera, Upload, Trash2 } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import CameraModal from './CameraModal';

const DigitalNotebook = ({ notes, isOwner, onFileUpload, onDeleteNote, setSlideshowIndex, fileInputRef, cameraInputRef }) => {
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    if ((!notes || notes.length === 0) && !isOwner) return null;

    const handleModalCapture = (file) => {
        onFileUpload({ target: { files: [file] } }, 'camera');
    };

    return (
        <section className="dashboard-panel">
            <div className="panel-header between">
                <h2><StickyNote size={20} /> Digital Notebook</h2>
                {isOwner && (
                    <div className="note-actions">
                        {isMobile ? (
                            <label className="btn-icon" htmlFor="camera-upload-input" title="Scan Note" style={{ cursor: 'pointer' }}>
                                <Camera size={18} />
                            </label>
                        ) : (
                            <button className="btn-icon" onClick={() => setIsCameraOpen(true)} title="Scan Note">
                                <Camera size={18} />
                            </button>
                        )}
                        <input id="camera-upload-input" type="file" ref={cameraInputRef} onChange={(e) => onFileUpload(e, 'camera')} style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }} accept="image/*" capture />
                        
                        <label className="btn-icon" htmlFor="file-upload-input" title="Upload Note" style={{ cursor: 'pointer' }}>
                            <Upload size={18} />
                        </label>
                        <input id="file-upload-input" type="file" ref={fileInputRef} onChange={(e) => onFileUpload(e, 'upload')} style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }} accept="image/*" />
                    </div>
                )}
            </div>
            <div className="note-grid-container">
                <div className="note-grid">
                    {notes?.map((note, idx) => (
                        <div key={note.id} className="note-item">
                            <SmartImage 
                                src={note.url} 
                                alt="Note" 
                                onClick={() => setSlideshowIndex(idx)} 
                                fallbackType="project"
                            />
                            {isOwner && (
                                <button className="delete-note" onClick={() => onDeleteNote(note.id)}>
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            {isCameraOpen && (
                <CameraModal 
                    isOpen={isCameraOpen} 
                    onClose={() => setIsCameraOpen(false)} 
                    onCapture={handleModalCapture} 
                />
            )}
        </section>
    );
};

export default DigitalNotebook;
