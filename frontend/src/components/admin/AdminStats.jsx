import React from 'react';
import { TrendingUp, Clock, Users } from 'lucide-react';
import DuckIcon from '../common/DuckIcon';

const AdminStats = ({ stats, onApprovalClick }) => {
    return (
        <div className="stats-grid">
            <div className="stat-card">
                <div className="stat-icon ducks"><DuckIcon size={32} color="white" /></div>
                <div className="stat-info">
                    <span className="stat-label">Total Ducks In Circulation</span>
                    <span className="stat-value">{stats.total_ducks.toLocaleString()}</span>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon week"><TrendingUp size={24} /></div>
                <div className="stat-info">
                    <span className="stat-label">Earned This Week</span>
                    <span className="stat-value">{stats.ducks_earned_this_week.toLocaleString()}</span>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon pending"><Clock size={24} /></div>
                <div className="stat-info">
                    <span className="stat-label">Pending Trades</span>
                    <span className="stat-value">{stats.pending_trades_count}</span>
                </div>
            </div>
            <div className="stat-card clickable" onClick={onApprovalClick}>
                <div className="stat-icon approval"><Users size={24} /></div>
                <div className="stat-info">
                    <span className="stat-label">System Approvals</span>
                    <span className="stat-value">{stats.pending_users_count || 0}</span>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon active"><Users size={24} /></div>
                <div className="stat-info">
                    <span className="stat-label">Online Users</span>
                    <span className="stat-value">{stats.active_users_count}</span>
                </div>
            </div>
        </div>
    );
};

export default AdminStats;
