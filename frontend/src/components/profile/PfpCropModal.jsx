import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useModalA11y from '../../hooks/useModalA11y';

const PfpCropModal = ({ isCropping, cropImgRef, cropImage, isUploadingPic, onCancel, onSave }) => {
    const dialogRef = useRef(null);
    const titleId = useId();

    useModalA11y({ isOpen: Boolean(isCropping), onClose: onCancel, containerRef: dialogRef });

    if (!isCropping) return null;

    return createPortal(
        <div className="modal-overlay crop-modal-overlay">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="modal-content crop-modal-content">
                <div className="modal-header">
                    <h2 id={titleId}>Adjust Profile Picture</h2>
                    <button className="close-modal" onClick={onCancel} aria-label="Close"><X size={24} /></button>
                </div>
                <div className="crop-area">
                    <img ref={cropImgRef} src={cropImage} alt="To crop" className="max-w-100" />
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn-primary" onClick={onSave} disabled={isUploadingPic}>
                        {isUploadingPic ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PfpCropModal;
