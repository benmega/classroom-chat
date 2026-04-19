import React from 'react';
import { StickyNote, Camera, Upload, Trash2 } from 'lucide-react';
import SmartImage from '../common/SmartImage';

const DigitalNotebook = ({ notes, isOwner, onFileUpload, onDeleteNote, setSlideshowIndex, fileInputRef, cameraInputRef }) => {
    return (
        <section className="dashboard-panel">
            <div className="panel-header between">
                <h2><StickyNote size={20} /> Digital Notebook</h2>
                {isOwner && (
                    <div className="note-actions">
                        <button className="btn-icon" onClick={() => cameraInputRef.current?.click()} title="Scan Note"><Camera size={18} /></button>
                        <button className="btn-icon" onClick={() => fileInputRef.current?.click()} title="Upload Note"><Upload size={18} /></button>
                        <input type="file" ref={fileInputRef} onChange={(e) => onFileUpload(e, 'upload')} hidden accept="image/*" />
                        <input type="file" ref={cameraInputRef} onChange={(e) => onFileUpload(e, 'camera')} hidden accept="image/*" capture="environment" />
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
        </section>
    );
};

export default DigitalNotebook;
