import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ColumnFilterDropdown from './ColumnFilterDropdown';

const options = [
  { label: 'Student', value: 'student' },
  { label: 'Parent', value: 'parent' },
  { label: 'Admin', value: 'admin' },
];

const renderDropdown = (props = {}) => {
  const handlers = { onApply: vi.fn(), onSort: vi.fn() };
  const view = render(
    <ColumnFilterDropdown label="Role" sortKey="role" options={options} {...handlers} {...props} />
  );
  return { ...view, ...handlers };
};

const trigger = () => screen.getByRole('button', { name: 'Sort and filter Role' });
const open = () => fireEvent.click(trigger());
const checkbox = (name) => screen.getByRole('checkbox', { name });

describe('ColumnFilterDropdown', () => {
  it('shows the column label and keeps the menu closed until asked', () => {
    renderDropdown();

    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens and closes from the trigger', () => {
    renderDropdown();

    open();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');

    open();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not pass the click through to the table header it sits in', () => {
    // A sortable header listens for clicks above the dropdown: none may get through to it
    const onAnyClick = vi.fn();
    document.addEventListener('click', onAnyClick);
    renderDropdown();

    open();
    fireEvent.click(screen.getByRole('menu'));
    fireEvent.click(screen.getByText('Sort Ascending'));

    document.removeEventListener('click', onAnyClick);
    expect(onAnyClick).not.toHaveBeenCalled();
  });

  it('closes on Escape and on a click elsewhere, but not on a click inside', () => {
    renderDropdown();

    open();
    fireEvent.mouseDown(screen.getByText('Sort Ascending'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    open();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  describe('sorting', () => {
    it('sorts ascending and closes', () => {
      const { onSort } = renderDropdown();
      open();

      fireEvent.click(screen.getByText('Sort Ascending'));

      expect(onSort).toHaveBeenCalledWith('role', 'asc');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('sorts descending', () => {
      const { onSort } = renderDropdown();
      open();

      fireEvent.click(screen.getByText('Sort Descending'));

      expect(onSort).toHaveBeenCalledWith('role', 'desc');
    });

    it('highlights the active sort direction and the trigger', () => {
      renderDropdown({ activeSort: { sortBy: 'role', sortDir: 'desc' } });
      expect(trigger()).toHaveClass('active');
      open();

      expect(screen.getByText('Sort Descending').closest('button')).toHaveClass('active');
      expect(screen.getByText('Sort Ascending').closest('button')).not.toHaveClass('active');
    });

    it('does not highlight a sort that is on another column', () => {
      renderDropdown({ activeSort: { sortBy: 'username', sortDir: 'asc' } });
      expect(trigger()).not.toHaveClass('active');
      open();

      expect(screen.getByText('Sort Ascending').closest('button')).not.toHaveClass('active');
    });

    it('offers no sorting for a column without a sort key', () => {
      renderDropdown({ sortKey: undefined });
      open();

      expect(screen.queryByText('Sort Ascending')).not.toBeInTheDocument();
      expect(screen.queryByText('Sort Descending')).not.toBeInTheDocument();
      expect(checkbox('Student')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('starts from the values that are currently selected', () => {
      renderDropdown({ selected: ['parent'] });
      expect(trigger()).toHaveClass('active');
      open();

      expect(checkbox('Parent')).toBeChecked();
      expect(checkbox('Student')).not.toBeChecked();
    });

    it('applies the checked values and closes', () => {
      const { onApply } = renderDropdown();
      open();

      fireEvent.click(checkbox('Student'));
      fireEvent.click(checkbox('Admin'));
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      expect(onApply).toHaveBeenCalledWith(['student', 'admin']);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('unchecks a value that was checked', () => {
      const { onApply } = renderDropdown({ selected: ['student', 'admin'] });
      open();

      fireEvent.click(checkbox('Student'));
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      expect(onApply).toHaveBeenCalledWith(['admin']);
    });

    it('selects every value at once', () => {
      const { onApply } = renderDropdown();
      open();

      fireEvent.click(screen.getByRole('button', { name: 'Select All' }));
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      expect(onApply).toHaveBeenCalledWith(['student', 'parent', 'admin']);
    });

    it('clears the checks without applying until Apply is pressed', () => {
      const { onApply } = renderDropdown({ selected: ['student'] });
      open();

      fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
      expect(checkbox('Student')).not.toBeChecked();
      expect(onApply).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(onApply).toHaveBeenCalledWith([]);
    });

    it('removes the filter straight away with Clear Filter', () => {
      const { onApply } = renderDropdown({ selected: ['student'] });
      open();

      fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));

      expect(onApply).toHaveBeenCalledWith([]);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('drops unapplied checks when the menu is closed and opened again', () => {
      const { onApply } = renderDropdown({ selected: ['student'] });
      open();
      fireEvent.click(checkbox('Admin'));
      fireEvent.keyDown(document, { key: 'Escape' });

      open();

      expect(checkbox('Admin')).not.toBeChecked();
      expect(checkbox('Student')).toBeChecked();
      expect(onApply).not.toHaveBeenCalled();
    });

    it('offers no filtering for a column without options', () => {
      renderDropdown({ options: undefined });
      open();

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
      expect(screen.getByText('Sort Ascending')).toBeInTheDocument();
    });

    it('offers no filtering for an empty option list either', () => {
      renderDropdown({ options: [] });
      open();

      expect(screen.queryByRole('button', { name: 'Select All' })).not.toBeInTheDocument();
    });
  });
});
