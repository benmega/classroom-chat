import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    TrendingDown, 
    Activity, 
    Calendar,
    ArrowLeft,
    PieChart as PieChartIcon,
    RefreshCw,
    Download,
    DollarSign,
    Users
} from 'lucide-react';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    Title, 
    Tooltip, 
    Legend, 
    Filler,
    ArcElement
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './Analytics.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

const Analytics = () => {
    const navigate = useNavigate();
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [timeRange, setTimeRange] = useState('7d');

    const fetchAnalytics = async () => {
        setIsRefreshing(true);
        try {
            // Reusing the dashboard data for now as it contains the chart info
            const response = await client.get('/api/admin/dashboard');
            if (response.data.status === 'success') {
                setAnalyticsData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load system analytics.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    if (isLoading) return (
        <div className="admin-loading-container">
            <div className="admin-loader"></div>
            <p>Processing system data...</p>
        </div>
    );

    const { chart_data, total_ducks, ducks_earned_this_week, users } = analyticsData;

    const lineChartData = {
        labels: chart_data.labels,
        datasets: [
            {
                label: 'Ducks Earned',
                data: chart_data.earned,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Ducks Spent',
                data: chart_data.spent,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
            }
        ]
    };

    const userDistributionData = {
        labels: ['Active Students', 'Inactive Students', 'Administrators'],
        datasets: [{
            data: [
                users.filter(u => u.is_online && !u.is_admin).length,
                users.filter(u => !u.is_online && !u.is_admin).length,
                users.filter(u => u.is_admin).length
            ],
            backgroundColor: ['#10b981', '#94a3b8', '#6366f1'],
            borderWidth: 0,
        }]
    };

    const handleExport = async () => {
        try {
            const response = await client.get('/api/admin/export/transactions', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = `duck_transactions_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Transaction history exported.');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export transaction data.');
        }
    };

    return (
        <div className="admin-analytics-page">
            <AdminPageHeader 
                title="Economic Analytics" 
                description="Real-time data on duck circulation and system activity."
            >
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="range-select">
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                </select>
                <button className="icon-btn" onClick={fetchAnalytics} disabled={isRefreshing}>
                    <RefreshCw size={20} className={isRefreshing ? 'spinning' : ''} />
                </button>
                <button className="primary-btn" onClick={handleExport}>
                    <Download size={18} /> Export CSV
                </button>
            </AdminPageHeader>

            <div className="analytics-grid">
                <div className="main-charts">
                    <div className="chart-card card">
                        <div className="card-header">
                            <h3><Activity size={20} /> Transaction Flow</h3>
                        </div>
                        <div className="chart-container">
                            <Line 
                                data={lineChartData} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'top', labels: { usePointStyle: true } }
                                    },
                                    scales: {
                                        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                                        x: { grid: { display: false } }
                                    }
                                }} 
                            />
                        </div>
                    </div>

                    <div className="lower-grid">
                        <div className="stats-card card">
                            <h3><DollarSign size={20} /> Economy Summary</h3>
                            <div className="simple-stat-list">
                                <div className="simple-stat">
                                    <span className="label">Total Supply</span>
                                    <span className="value">🦆 {total_ducks.toLocaleString()}</span>
                                </div>
                                <div className="simple-stat">
                                    <span className="label">Minted (7d)</span>
                                    <span className="value positive">+ {ducks_earned_this_week.toLocaleString()}</span>
                                </div>
                                <div className="simple-stat">
                                    <span className="label">Avg. Balance</span>
                                    <span className="value">🦆 {(total_ducks / users.length).toFixed(1)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="distribution-card card">
                            <h3><PieChartIcon size={20} /> User Breakdown</h3>
                            <div className="pie-container">
                                <Pie 
                                    data={userDistributionData}
                                    options={{
                                        plugins: {
                                            legend: { position: 'bottom' }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="recent-activity-sidebar">
                    <div className="card">
                        <h3><Calendar size={20} /> High Value Earners</h3>
                        <div className="top-earners">
                            {users.sort((a,b) => b.duck_balance - a.duck_balance).slice(0, 5).map(u => (
                                <div key={u.id} className="earner-item">
                                    <div className="user-info">
                                        <div className="name">{u.nickname || u.username}</div>
                                        <div className="handle">@{u.username}</div>
                                    </div>
                                    <div className="amount">🦆 {(u.duck_balance ?? 0).toFixed(1)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h3><Users size={20} /> System Reach</h3>
                        <div className="stat-highlight">
                            <div className="stat-box">
                                <span className="big-val">{users.length}</span>
                                <span className="label">Total Residents</span>
                            </div>
                            <div className="stat-box">
                                <span className="big-val">{(users.filter(u => u.is_online).length / users.length * 100).toFixed(0)}%</span>
                                <span className="label">Engagement</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
