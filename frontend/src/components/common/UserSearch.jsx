import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, X, User } from 'lucide-react';
import client from '../../api/client';
import SmartImage from './SmartImage';

const UserSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef(null);
    const navigate = useNavigate();

    // Handle debounced search
    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([]);
                setIsOpen(false);
                return;
            }

            setIsLoading(true);
            try {
                const response = await client.get(`/user/api/users/search?q=${encodeURIComponent(query)}`);
                const data = response.data.data?.users || response.data.users || [];
                setResults(data);
                setIsOpen(data.length > 0);
            } catch (error) {
                console.error('Error fetching search results:', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectResult = (user) => {
        setQuery('');
        setIsOpen(false);
        navigate(`/profile/${user.slug}`);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < results.length) {
                handleSelectResult(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div className="user-search-container" ref={containerRef}>
            <div className={`search-input-wrapper ${isOpen ? 'active' : ''}`}>
                <Search className="search-icon" size={18} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedIndex(-1);
                    }}
                    onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search users..."
                    className="user-search-input"
                />
                {isLoading ? (
                    <Loader2 className="search-loader" size={16} />
                ) : query && (
                    <button className="clear-search" onClick={() => setQuery('')}>
                        <X size={16} />
                    </button>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="search-results-dropdown">
                    {results.map((user, index) => (
                        <div
                            key={user.id}
                            className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                            onClick={() => handleSelectResult(user)}
                        >
                            <div className="result-avatar">
                                <SmartImage 
                                    src={user.profile_picture_url} 
                                    alt={user.nickname} 
                                    fallbackType="avatar"
                                />
                            </div>
                            <div className="result-info">
                                <span className="result-nickname">{user.nickname}</span>
                                <span className="result-username">@{user.username}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserSearch;
