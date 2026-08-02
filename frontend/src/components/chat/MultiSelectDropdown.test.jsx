import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MultiSelectDropdown from './MultiSelectDropdown';

describe('MultiSelectDropdown Component', () => {
  const options = [
    { id: 1, name: 'Class Alpha' },
    { id: 2, name: 'Class Beta' }
  ];

  it('renders trigger button with default label', () => {
    render(
      <MultiSelectDropdown
        options={options}
        selectedValues={[]}
        onChange={() => {}}
        defaultLabel="Classes"
      />
    );

    expect(screen.getByRole('button')).toHaveTextContent('Classes');
  });

  it('opens menu when trigger is clicked', () => {
    render(
      <MultiSelectDropdown
        options={options}
        selectedValues={[]}
        onChange={() => {}}
        defaultLabel="Classes"
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Class Alpha')).toBeInTheDocument();
    expect(screen.getByText('Class Beta')).toBeInTheDocument();
  });

  it('respects explicit placement prop "top"', () => {
    render(
      <MultiSelectDropdown
        options={options}
        selectedValues={[]}
        onChange={() => {}}
        defaultLabel="Classes"
        placement="top"
      />
    );

    fireEvent.click(screen.getByRole('button'));
    const menu = screen.getByRole('listbox');
    expect(menu.className).toContain('drop-up');
  });

  it('respects explicit placement prop "bottom"', () => {
    render(
      <MultiSelectDropdown
        options={options}
        selectedValues={[]}
        onChange={() => {}}
        defaultLabel="Classes"
        placement="bottom"
      />
    );

    fireEvent.click(screen.getByRole('button'));
    const menu = screen.getByRole('listbox');
    expect(menu.className).toContain('drop-down');
  });

  it('calls onChange when an option is selected', () => {
    const handleChange = vi.fn();
    render(
      <MultiSelectDropdown
        options={options}
        selectedValues={[]}
        onChange={handleChange}
        defaultLabel="Classes"
      />
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Class Alpha'));

    expect(handleChange).toHaveBeenCalledWith([1]);
  });

  it('shows selected count label when multiple options selected', () => {
    render(
      <MultiSelectDropdown
        options={[...options, { id: 3, name: 'Class Gamma' }]}
        selectedValues={[1, 2]}
        onChange={() => {}}
        defaultLabel="Classes"
      />
    );

    expect(screen.getByRole('button')).toHaveTextContent('2 selected');
  });
});
