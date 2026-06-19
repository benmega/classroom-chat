import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
    Search, 
    RefreshCw, 
    ChevronLeft, 
    ChevronRight, 
    ArrowUpRight, 
    ArrowDownRight, 
    Download,
    ArrowLeft
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import './DuckTransactions.css';

const DuckTransactions = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read parameters from search query
    const typeParam = searchParams.get('type') || 'all';
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const searchParam = searchParams.get('search') || '';

    const [transactions, setTransactions] = useState([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState(searchParam);

    const fetchTransactions = async (pageVal = pageParam, typeVal = typeParam, searchVal = searchParam) => {
        setIsRefreshing(true);
        try {
            const response = await client.get('/api/admin/transactions', {
                params: {
                    page: pageVal,
                    per_page: 20,
                    type: typeVal,
                    search: searchVal
                }
            });
            if (response.data.status === 'success') {
                setTransactions(response.data.data.transactions);
                setTotal(response.data.data.total);
                setPages(response.data.data.pages);
            } else {
                toast.error('Failed to load transactions.');
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Failed to load transactions.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Refetch when search params change
    useEffect(() => {
        fetchTransactions(pageParam, typeParam, searchParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageParam, typeParam, searchParam]);

    // Handle Search Submit
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSearchParams({
            type: typeParam,
            page: '1',
            search: searchTerm
        });
    };

    // Handle Tab/Type filter change
    const handleTypeChange = (newType) => {
        setSearchParams({
            type: newType,
            page: '1',
            search: searchParam
        });
    };

    // Handle Page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pages) {
            setSearchParams({
                type: typeParam,
                page: String(newPage),
                search: searchParam
            });
        }
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

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="admin-transactions-page">
            <div className="back-link" onClick={() => navigate('/admin')}>
                <ArrowLeft size={16} /> Back to Dashboard
            </div>

            <AdminPageHeader 
                title="Duck Transactions" 
                description="Monitor all transactions, including ducks earned, spent, and adjustments."
            >
                <form className="search-bar" onSubmit={handleSearchSubmit}>
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by user or reason..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>
                <button className="primary-btn export-btn" onClick={handleExport}>
                    <Download size={18} /> Export CSV
                </button>
                <button 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={() => fetchTransactions(pageParam, typeParam, searchParam)}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={18} />
                </button>
            </AdminPageHeader>

            {/* Filter Tabs */}
            <div className="filter-tabs-container">
                <div className="filter-tabs">
                    <button 
                        className={`tab-btn ${typeParam === 'all' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('all')}
                    >
                        All Transactions
                    </button>
                    <button 
                        className={`tab-btn ${typeParam === 'earned' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('earned')}
                    >
                        Ducks Earned (+)
                    </button>
                    <button 
                        className={`tab-btn ${typeParam === 'spent' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('spent')}
                    >
                        Ducks Spent (-)
                    </button>
                </div>
            </div>

            <div className="transactions-table-container card">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spinning" />
                        <p>Loading transactions...</p>
                    </div>
                ) : (
                    <>
                        <table className="transactions-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Amount</th>
                                    <th>Reason</th>
                                    <th>Date & Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length > 0 ? (
                                    transactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td>
                                                <div className="user-cell">
                                                    <span className="user-name">{tx.nickname || tx.username}</span>
                                                    <span className="user-handle">@{tx.username}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className={`amount-badge ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                                                    {tx.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                    <span>{tx.amount > 0 ? `+${tx.amount}` : tx.amount} 🦆</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="reason-text">{tx.reason || 'No reason provided'}</span>
                                            </td>
                                            <td>
                                                <span className="date-text">{formatDate(tx.timestamp)}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="empty-row">
                                            No transactions found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {transactions.length > 0 && (
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    Showing <strong>{(pageParam - 1) * 20 + 1}-{Math.min(pageParam * 20, total)}</strong> of <strong>{total}</strong> transactions
                                </div>
                                <div className="pagination-controls">
                                    <button 
                                        className="pagination-btn" 
                                        onClick={() => handlePageChange(pageParam - 1)}
                                        disabled={pageParam <= 1 || isRefreshing}
                                    >
                                        <ChevronLeft size={16} /> Previous
                                    </button>
                                    <div className="pagination-pages">
                                        <span className="page-indicator">Page <strong>{pageParam}</strong> of {pages}</span>
                                    </div>
                                    <button 
                                        className="pagination-btn" 
                                        onClick={() => handlePageChange(pageParam + 1)}
                                        disabled={pageParam >= pages || isRefreshing}
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DuckTransactions;
