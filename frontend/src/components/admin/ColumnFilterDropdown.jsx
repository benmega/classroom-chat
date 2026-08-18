import React, { useState, useRef, useEffect } from 'react';
import { Filter, ArrowUp, ArrowDown } from 'lucide-react';
import './ColumnFilterDropdown.css';

/**
 * Excel-style column header control: sort ascending/descending and/or
 * filter by a checklist of discrete values.
 *
 * sortKey: identifier sent to the backend's sort_by param (omit to disable sorting)
 * options: [{ label, value }] for the checkbox list (omit to disable filtering)
 * selected: array of currently-checked values
 * onApply: (values) => void, called when the user applies the checkbox selection
 * activeSort: { sortBy, sortDir } from the parent, used to highlight the active sort
 * onSort: (sortKey, dir) => void
 */
const ColumnFilterDropdown = ({ label, sortKey, options, selected = [], onApply, activeSort, onSort }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState(selected);
    const ref = useRef(null);

    const toggleDropdown = () => {
        if (!isOpen) setDraft(selected);
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, []);

    const isFiltered = selected.length > 0;
    const isSorted = sortKey && activeSort?.sortBy === sortKey;

    const toggleValue = (value) => {
        setDraft(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };

    const handleApply = () => {
        onApply(draft);
        setIsOpen(false);
    };

    const handleClear = () => {
        setDraft([]);
        onApply([]);
        setIsOpen(false);
    };

    const handleSelectAll = () => {
        setDraft(options.map(o => o.value));
    };

    const handleSort = (dir) => {
        onSort(sortKey, dir);
        setIsOpen(false);
    };

    return (
        <span className="column-filter-container" ref={ref}>
            {label}
            <button
                type="button"
                className={`column-filter-trigger ${(isFiltered || isSorted) ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                title="Sort & filter"
                aria-label={`Sort and filter ${label}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <Filter size={13} />
            </button>
            {isOpen && (
                <div className="column-filter-dropdown" role="menu" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false); }}>
                    {sortKey && (
                        <div className="column-filter-sort-group">
                            <button
                                type="button"
                                className={`column-filter-sort-btn ${isSorted && activeSort.sortDir === 'asc' ? 'active' : ''}`}
                                onClick={() => handleSort('asc')}
                            >
                                <ArrowUp size={14} /> Sort Ascending
                            </button>
                            <button
                                type="button"
                                className={`column-filter-sort-btn ${isSorted && activeSort.sortDir === 'desc' ? 'active' : ''}`}
                                onClick={() => handleSort('desc')}
                            >
                                <ArrowDown size={14} /> Sort Descending
                            </button>
                        </div>
                    )}
                    {options && options.length > 0 && (
                        <>
                            {sortKey && <div className="column-filter-divider" />}
                            <div className="column-filter-select-row">
                                <button type="button" className="column-filter-link-btn" onClick={handleSelectAll}>Select All</button>
                                <button type="button" className="column-filter-link-btn" onClick={() => setDraft([])}>Clear</button>
                            </div>
                            <div className="column-filter-options">
                                {options.map(opt => (
                                    <label className="column-filter-option" key={opt.value}>
                                        <input
                                            type="checkbox"
                                            checked={draft.includes(opt.value)}
                                            onChange={() => toggleValue(opt.value)}
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                            <div className="column-filter-actions">
                                <button type="button" className="column-filter-apply-btn" onClick={handleApply}>Apply</button>
                                <button type="button" className="column-filter-clear-btn" onClick={handleClear}>Clear Filter</button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </span>
    );
};

export default ColumnFilterDropdown;
