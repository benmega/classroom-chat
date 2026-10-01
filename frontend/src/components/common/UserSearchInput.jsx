import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { getApiUrl } from '../../utils/apiUrl';
import client from '../../api/client';
import SmartImage from './SmartImage';
import './UserSearchInput.css';

const UserSearchInput = ({ 
    value, 
    onChange, 
    onSelect, 
    placeholder = "Search users...", 
    className = "",
    containerClassName = "",
    wrapperClassName = "",
    dropdownClassName = "",
    showIcon = true,
    showClear = true,
    debounceMs = 300,
    minChars = 2,
    id
}) => {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef(null);
    // True once the user has closed the dropdown (Escape, select, clear, click outside)
    // and has not typed or reopened it since. A search response that arrives later
    // must not pop the dropdown back open.
    const dismissedRef = useRef(false);

    // Sync internal query with external value (e.g. for clearing the field or initial load).
    // Only when the prop itself changes: a controlled parent that does not echo onChange
    // must not have its user's typing reverted.
    useEffect(() => {
        if (value !== undefined) {
            setQuery(value || '');
        }
    }, [value]);

    useEffect(() => {
        // Each run owns its own request: the cleanup below aborts it and marks the run
        // stale, so an out-of-date response can never overwrite newer results.
        const controller = new AbortController();
        let cancelled = false;

        const fetchResults = async () => {
            // Only fetch if query is long enough
            if (query.trim().length < minChars) {
                setResults([]);
                setIsOpen(false);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // If it's for the challenge, we only search for other people
                // backend handles exclusion by standard search logic but usually we want all
                const response = await client.get(`/user/api/users/search?q=${encodeURIComponent(query)}`, {
                    signal: controller.signal,
                });
                if (cancelled) return;
                const data = response.data.data?.users || response.data.users || [];
                setResults(data);
                setIsOpen(!dismissedRef.current && data.length > 0);
                setSelectedIndex(-1);
            } catch (error) {
                if (cancelled) return;
                console.error('Error fetching search results:', error);
                setResults([]);
            } finally {
                // A newer run is responsible for the loading state once this one is stale.
                if (!cancelled) setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, debounceMs);
        return () => {
            clearTimeout(timer);
            cancelled = true;
            controller.abort();
        };
    }, [query, debounceMs, minChars]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                dismissedRef.current = true;
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openDropdown = () => {
        dismissedRef.current = false;
        setIsOpen(true);
    };

    const handleSelectInternal = (user) => {
        dismissedRef.current = true;
        setIsOpen(false);
        if (onSelect) {
            onSelect(user);
        } else {
            // Default behavior if not handled: set query to username
            setQuery(user.username);
            if (onChange) onChange(user.username);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (results.length > 0) {
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
                openDropdown();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < results.length) {
                e.preventDefault();
                handleSelectInternal(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            dismissedRef.current = true;
            setIsOpen(false);
        }
    };

    const handleInputChange = (e) => {
        const newVal = e.target.value;
        setQuery(newVal);
        if (onChange) onChange(newVal);
        setSelectedIndex(-1);
        dismissedRef.current = false;
        if (newVal.trim().length >= minChars) {
            setIsOpen(true);
        }
    };

    const handleClear = () => {
        dismissedRef.current = true;
        setQuery('');
        if (onChange) onChange('');
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div className={`user-search-common-container ${containerClassName}`} ref={containerRef}>
            <div className={`search-input-wrapper-common ${wrapperClassName} ${isOpen && query.trim().length >= minChars ? 'active' : ''}`}>
                {showIcon && <Search className="search-icon-common" size={18} />}
                <input
                    id={id || "user-search-input"}
                    name="search"
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => query.trim().length >= minChars && results.length > 0 && openDropdown()}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={`user-search-input-common ${className}`}
                    autoComplete="off"
                />
                <div className="status-indicator">
                    {isLoading ? (
                        <Loader2 className="search-loader-common" size={16} />
                    ) : (showClear && query) ? (
                        <button type="button" className="clear-search-common" onClick={handleClear} title="Clear search">
                            <X size={16} />
                        </button>
                    ) : null}
                </div>
            </div>

            {isOpen && results.length > 0 && (
                <div className={`search-results-dropdown-common ${dropdownClassName}`}>
                    {results.map((user, index) => (
                        <div role="button" tabIndex={0}
                            key={user.id}
                            className={`search-result-item-common ${index === selectedIndex ? 'selected' : ''}`}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleSelectInternal(user)}
                        >
                            <div className="result-avatar-common">
                                <SmartImage 
                                    src={getApiUrl(user.profile_picture_url)} 
                                    alt={user.nickname} 
                                    fallbackType="avatar"
                                />
                            </div>
                            <div className="result-info-common">
                                <span className="result-nickname-common">{user.nickname}</span>
                                <span className="result-username-common">@{user.username}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserSearchInput;
