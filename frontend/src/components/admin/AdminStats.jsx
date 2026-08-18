import React from 'react';
import { TrendingUp, Users, DollarSign, UserCircle } from 'lucide-react';
import DuckIcon from '../Icons/DuckIcon';

const AdminStats = ({ stats, onEarnedWeekClick, onTotalDucksClick, onOnlineUsersClick, onTotalResidentsClick }) => {
    const totalResidents = stats.total_users_count ?? 0;
    const avgBalance = totalResidents ? stats.total_ducks / totalResidents : 0;

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
            <div className="stat-card">
                <div className="stat-icon avg-balance"><DollarSign size={24} /></div>
                <div className="stat-info">
                    <span className="stat-label">Avg. Balance</span>
                    <span className="stat-value">🦆 {avgBalance.toFixed(1)}</span>
                </div>
            </div>
            <div role="button" tabIndex={0} className="stat-card clickable" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onTotalResidentsClick}>
                <div className="stat-icon residents"><UserCircle size={24} /></div>
                <div className="stat-info">
                    <span className="stat-label">Total Residents</span>
                    <span className="stat-value">{totalResidents}</span>
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
