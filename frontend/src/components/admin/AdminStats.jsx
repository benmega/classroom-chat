import React from 'react';
import { TrendingUp, Clock, Users } from 'lucide-react';
import DuckIcon from '../Icons/DuckIcon';

const AdminStats = ({ stats, onApprovalClick, onTradeClick, onEarnedWeekClick, onTotalDucksClick, onOnlineUsersClick }) => {
    return (
        <div className="stats-grid">
            <div role="button" tabIndex={0} className="stat-card clickable" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onTotalDucksClick}>
                <div className="stat-icon ducks"><DuckIcon size={32} color="white" /></div>
                <div className="stat-info">
                    <span className="stat-label">Ducks In Circulation</span>
                    <span className="stat-value">{stats.total_ducks.toLocaleString()}</span>
                </div>
            </div>
            <div role="button" tabIndex={0} className="stat-card clickable" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onEarnedWeekClick}>
                <div className="stat-icon week"><TrendingUp size={24} /></div>
                <div className="stat-info">
                    <span className="stat-label">Earned This Week</span>
                    <span className="stat-value">{stats.ducks_earned_this_week.toLocaleString()}</span>
                </div>
            </div>
            <div role="button" tabIndex={0} className="stat-card clickable" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onTradeClick}>
                <div className="stat-icon pending"><Clock size={24} /></div>
                <div className="stat-info">
                    <span className="stat-label">Pending Trades</span>
                    <span className="stat-value">{stats.pending_trades_count || 0}</span>
                </div>
            </div>
            <div role="button" tabIndex={0} className="stat-card clickable" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onApprovalClick}>
                <div className="stat-icon approval"><Users size={24} /></div>
                <div className="stat-info">
                    <span className="stat-label">Account Approvals</span>
                    <span className="stat-value">{stats.pending_users_count || 0}</span>
                </div>
            </div>
            <div role="button" tabIndex={0} className="stat-card clickable" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onOnlineUsersClick}>
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
