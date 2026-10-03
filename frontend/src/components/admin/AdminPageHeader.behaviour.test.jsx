import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminPageHeader from './AdminPageHeader';

const toggleSidebar = vi.fn();
vi.mock('../../hooks/useSidebar', () => ({
  default: () => ({ toggleSidebar }),
}));

describe('AdminPageHeader', () => {
  it('shows the page title as the heading', () => {
    render(<AdminPageHeader title="Users" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument();
  });

  it('shows no action area without children', () => {
    const { container } = render(<AdminPageHeader title="Users" />);

    expect(container.querySelector('.header-actions')).toBeNull();
  });

  it('shows the actions it is given', () => {
    const { container } = render(
      <AdminPageHeader title="Users">
        <button>Add user</button>
      </AdminPageHeader>
    );

    expect(container.querySelector('.header-actions')).toContainElement(screen.getByRole('button', { name: 'Add user' }));
  });

  it('opens the sidebar from the menu button', () => {
    toggleSidebar.mockClear();
    const { container } = render(<AdminPageHeader title="Users" />);

    fireEvent.click(container.querySelector('.hamburger-toggle'));

    expect(toggleSidebar).toHaveBeenCalledTimes(1);
  });
});
