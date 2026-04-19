import React from 'react';
import { X } from 'lucide-react';

const PfpCropModal = ({ isCropping, cropImgRef, cropImage, isUploadingPic, onCancel, onSave }) => {
    if (!isCropping) return null;

    return (
        <div className="modal-overlay crop-modal-overlay">
            <div className="modal-content crop-modal-content">
                <div className="modal-header">
                    <h2>Adjust Profile Picture</h2>
                    <button className="close-modal" onClick={onCancel}><X size={24} /></button>
                </div>
                <div className="crop-area">
                    <img ref={cropImgRef} src={cropImage} alt="To crop" style={{ maxWidth: '100%' }} />
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn-primary" onClick={onSave} disabled={isUploadingPic}>
                        {isUploadingPic ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PfpCropModal;
