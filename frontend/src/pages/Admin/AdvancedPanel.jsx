import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Layers,
    ShieldAlert,
    Terminal,
    Trash2
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import '../../components/admin/AdminShared.css';
import './AdvancedPanel.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Modal from '../../components/common/Modal';
import { getErrorMessage } from '../../utils/apiError';

const AdvancedPanel = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState('');
    const [showLogModal, setShowLogModal] = useState(false);
    const [showPurgeModal, setShowPurgeModal] = useState(false);
    const [isFetchingLogs, setIsFetchingLogs] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const logsButtonRef = useRef(null);

    // These two buttons are disabled while their data loads, so the browser has already moved focus off them when
    // the dialog opens and the Modal has no opener to return to. Hand focus back to the button when it closes.
    const closeLogs = () => {
        setShowLogModal(false);
        logsButtonRef.current.focus();
    };

    const fetchLogs = async () => {
        setIsFetchingLogs(true);
        try {
            const response = await client.get('/api/admin/logs');
            if (response.data.status === 'success') {
                setLogs(response.data.data.logs || 'No logs found.');
                setShowLogModal(true);
            }
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to fetch system logs.'));
            console.error(err);
        } finally {
            setIsFetchingLogs(false);
        }
    };

    const purgeHistory = async () => {
        setIsPurging(true);
        try {
            const response = await client.post('/api/admin/advanced/purge-history');
            if (response.data.status === 'success') {

                setShowPurgeModal(false);
            }
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to purge history.'));
            console.error(err);
        } finally {
            setIsPurging(false);
        }
    };

    return (
        <div className="admin-advanced-panel">
            <AdminPageHeader title="Database" />

            <div className="advanced-grid">
                <button className="btn-premium action-button" onClick={() => navigate('/admin/advanced-crud')}>
                    <Layers size={18} /> Headless Database CRUD
                </button>

                <button
                    ref={logsButtonRef}
                    className="btn-utility action-button"
                    onClick={fetchLogs}
                    disabled={isFetchingLogs}
                >
                    <ShieldAlert size={18} /> {isFetchingLogs ? 'Fetching...' : 'System Logs'}
                </button>

                <button
                    className="btn-danger action-button"
                    onClick={() => setShowPurgeModal(true)}
                >
                    <Trash2 size={18} /> Purge History
                </button>
            </div>

            <Modal
                isOpen={showLogModal}
                onClose={closeLogs}
                title={<span className="advanced-modal-title"><Terminal size={20} aria-hidden="true" />System Logs</span>}
                maxWidth="1000px"
                bodyClassName="advanced-modal-body"
            >
                <div className="advanced-modal-console">
                    <pre>{logs}</pre>
                </div>
                <div className="advanced-modal-footer">
                    <button type="button" className="btn-secondary" onClick={closeLogs}>Close</button>
                    <button type="button" className="btn-premium" onClick={fetchLogs}>Refresh</button>
                </div>
            </Modal>

            <Modal
                isOpen={showPurgeModal}
                onClose={() => setShowPurgeModal(false)}
                title={<span className="advanced-modal-title danger"><ShieldAlert size={20} aria-hidden="true" />Confirm History Purge</span>}
                maxWidth="1000px"
                bodyClassName="advanced-modal-body"
            >
                <div className="advanced-modal-console advanced-modal-danger">
                    <p className="warning-text">This action is <strong>PERMANENT</strong> and will delete all messages from the database.</p>
                    <p>Are you absolutely sure you want to proceed?</p>
                </div>
                <div className="advanced-modal-footer">
                    {/* Focus starts on the safe choice, not on the last button (the destructive one) */}
                    <button type="button" className="btn-secondary" data-autofocus onClick={() => setShowPurgeModal(false)}>Cancel</button>
                    <button
                        type="button"
                        className="btn-danger"
                        onClick={purgeHistory}
                        disabled={isPurging}
                    >
                        {isPurging ? 'Purging...' : 'Yes, Delete All History'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default AdvancedPanel;
