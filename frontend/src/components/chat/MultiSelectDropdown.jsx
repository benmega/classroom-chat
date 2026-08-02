/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './MultiSelectDropdown.css';

const MultiSelectDropdown = ({ 
  options, 
  selectedValues, 
  onChange, 
  defaultLabel, 
  icon: Icon, 
  disabled,
  placement = 'auto' // 'auto' | 'top' | 'bottom'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;

      if (placement === 'top') {
        setDropUp(true);
      } else if (placement === 'bottom') {
        setDropUp(false);
      } else {
        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;
        // Drop up if space below is less than 280px (menu height) and there is more space above
        setDropUp(spaceBelow < 280 && spaceAbove > spaceBelow);
      }

      if (rect.left + 250 > windowWidth) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
  }, [isOpen, placement]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleOption = (id) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter(val => val !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  const toggleAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]); 
    } else {
      onChange(options.map(o => o.id)); 
    }
  };

  const handleKeyDownOption = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  let label = defaultLabel;
  if (selectedValues.length === 1) {
    const selected = options.find(o => o.id === selectedValues[0]);
    label = selected ? (selected.name || selected.nickname || selected.username) : defaultLabel;
  } else if (selectedValues.length > 1 && selectedValues.length < options.length) {
    label = `${selectedValues.length} selected`;
  } else if (selectedValues.length === options.length && options.length > 0) {
    label = `All ${defaultLabel.toLowerCase()}`;
  }

  return (
    <div className={`multiselect-dropdown ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
      <button 
        type="button" 
        className={`multiselect-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {Icon && <Icon size={16} />}
        <span className="multiselect-label">{label}</span>
        <ChevronDown size={16} className="chevron" />
      </button>

      {isOpen && !disabled && (
        <div 
          className={`multiselect-menu ${dropUp ? 'drop-up' : 'drop-down'} ${alignRight ? 'align-right' : 'align-left'}`} 
          role="listbox" 
          aria-multiselectable="true"
        >
          <div 
            className="multiselect-option all-option" 
            onClick={toggleAll}
            onKeyDown={(e) => handleKeyDownOption(e, toggleAll)}
            tabIndex="0"
            role="option"
            aria-selected={selectedValues.length === options.length}
          >
            <div className={`checkbox ${selectedValues.length === options.length ? 'checked' : ''}`}>
              {selectedValues.length === options.length && <Check size={14} />}
            </div>
            <span>All {defaultLabel.toLowerCase()}</span>
          </div>
          <div className="multiselect-divider"></div>
          <div className="multiselect-options-list">
            {options.map(option => {
              const isSelected = selectedValues.includes(option.id);
              return (
                <div 
                  key={option.id} 
                  className="multiselect-option"
                  onClick={() => toggleOption(option.id)}
                  onKeyDown={(e) => handleKeyDownOption(e, () => toggleOption(option.id))}
                  tabIndex="0"
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <Check size={14} />}
                  </div>
                  <span>{option.name || option.nickname || option.username}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
