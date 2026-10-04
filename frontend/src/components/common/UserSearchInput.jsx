import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { getApiUrl } from '../../utils/apiUrl';
import client from '../../api/client';
import SmartImage from './SmartImage';
import './UserSearchInput.css';

// The id of option `index` in the listbox `listId`: the input points at it with aria-activedescendant.
const optionIdFor = (listId, index) => `${listId}-opt-${index}`;

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
    // Ties the input to the listbox (aria-controls) and its options (aria-activedescendant).
    const listId = useId();
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

    const isListOpen = isOpen && results.length > 0;

    // Keep the option picked with the arrow keys visible.
    useEffect(() => {
        if (selectedIndex < 0) return;
        document.getElementById(optionIdFor(listId, selectedIndex))?.scrollIntoView?.({ block: 'nearest' });
    }, [selectedIndex, listId]);

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
        } else if ((e.key === 'Home' || e.key === 'End') && isListOpen && selectedIndex >= 0) {
            // Only while an option is active: otherwise Home/End keep moving the caret in the text field.
            e.preventDefault();
            setSelectedIndex(e.key === 'Home' ? 0 : results.length - 1);
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < results.length) {
                e.preventDefault();
                handleSelectInternal(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            // The key that closes the list is used up here: an enclosing dialog must not also close on it.
            if (isListOpen) e.preventDefault();
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
                    role="combobox"
                    aria-label={placeholder}
                    aria-autocomplete="list"
                    aria-expanded={isListOpen}
                    aria-controls={isListOpen ? listId : undefined}
                    aria-activedescendant={isListOpen && selectedIndex >= 0 ? optionIdFor(listId, selectedIndex) : undefined}
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

            {isListOpen && (
                <div id={listId} role="listbox" aria-label={placeholder} className={`search-results-dropdown-common ${dropdownClassName}`}>
                    {results.map((user, index) => (
                        // Keyboard users pick options from the input (arrow keys + aria-activedescendant), so the rows take no focus.
                        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                        <div
                            role="option"
                            id={optionIdFor(listId, index)}
                            aria-selected={index === selectedIndex}
                            key={user.id}
                            className={`search-result-item-common ${index === selectedIndex ? 'selected' : ''}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectInternal(user)}
                        >
                            <div className="result-avatar-common">
                                <SmartImage 
                                    src={getApiUrl(user.profile_picture_url)} 
                                    alt=""
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
