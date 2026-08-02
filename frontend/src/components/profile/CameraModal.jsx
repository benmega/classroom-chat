import React, { useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import { Camera } from 'lucide-react';
import toast from 'react-hot-toast';

const CameraModal = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        let mediaStream = null;
        if (isOpen) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(s => {
                    mediaStream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                })
                .catch(err => {
                    console.error("Camera error:", err);
                    toast.error("Could not access camera.");
                    onClose();
                });
        }
        
        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, onClose]);

    const handleSnap = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Visual Flash Effect
        video.style.transition = 'opacity 0.1s ease-out';
        video.style.opacity = 0;
        setTimeout(() => { if (video) video.style.opacity = 1; }, 150);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                const uniqueFilename = `webcam_${Date.now()}.jpg`;
                const file = new File([blob], uniqueFilename, { type: "image/jpeg" });
                onCapture(file);
                onClose();
            } else {
                toast.error("Failed to capture image.");
            }
        }, 'image/jpeg');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Scan Note">
            <div style={{ textAlign: 'center', margin: '15px 0' }}>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    style={{
                        width: '100%',
                        maxWidth: '720px',
                        aspectRatio: '16 / 9',
                        objectFit: 'cover',
                        background: '#000',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-md)',
                        transform: 'scaleX(-1)'
                    }}
                >
                    <track kind="captions" />
                </video>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button className="btn-primary" onClick={handleSnap} style={{ padding: '12px 30px', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                    <Camera size={20} style={{ marginRight: '8px' }} /> Capture & Upload
                </button>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Modal>
    );
};

export default CameraModal;
