import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AdminPageHeader from './AdminPageHeader';

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

  it('renders without a sidebar provider, as it no longer reads the sidebar state', () => {
    render(<AdminPageHeader title="Users" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument();
  });
});
