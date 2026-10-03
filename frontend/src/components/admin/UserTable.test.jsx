import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserTable from './UserTable';

describe('UserTable Component', () => {
  const mockUsers = [
    {
      id: 1,
      username: 'alice',
      nickname: 'Alice Wonder',
      profile_picture: 'alice.png',
      duck_balance: 42,
      cc_levels: 5,
      oz_levels: 3,
      is_online: true,
    },
    {
      id: 2,
      username: 'bob',
      nickname: null,
      profile_picture: null,
      duck_balance: 0,
      cc_levels: 10,
      oz_levels: 0,
      is_online: false,
    },
  ];

  const mockOnAdjustDucks = vi.fn();
  const mockOnResetPassword = vi.fn();
  const mockOnRemoveUser = vi.fn();

  it('renders user details and online/offline status pills', () => {
    render(
      <UserTable
        users={mockUsers}
        onAdjustDucks={mockOnAdjustDucks}
        onResetPassword={mockOnResetPassword}
        onRemoveUser={mockOnRemoveUser}
      />
    );

    expect(screen.getByText('Alice Wonder')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('42 Ducks')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // 5 + 3 levels
    expect(screen.getByText('Online')).toBeInTheDocument();

    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
    expect(screen.getByText('0 Ducks')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // 10 + 0 levels
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('triggers action callbacks when action buttons are clicked', () => {
    render(
      <UserTable
        users={mockUsers}
        onAdjustDucks={mockOnAdjustDucks}
        onResetPassword={mockOnResetPassword}
        onRemoveUser={mockOnRemoveUser}
      />
    );

    const adjustBtns = screen.getAllByTitle('Adjust Ducks');
    fireEvent.click(adjustBtns[0]);
    expect(mockOnAdjustDucks).toHaveBeenCalledWith(mockUsers[0]);

    const passBtns = screen.getAllByTitle('Reset Password');
    fireEvent.click(passBtns[1]);
    expect(mockOnResetPassword).toHaveBeenCalledWith(mockUsers[1]);

    const deleteBtns = screen.getAllByTitle('Delete User');
    fireEvent.click(deleteBtns[0]);
    expect(mockOnRemoveUser).toHaveBeenCalledWith('alice');
  });

  it('includes 3D levels in the level total and treats missing td_levels as 0', () => {
    const users = [
      { id: 3, username: 'carol', duck_balance: 1, cc_levels: 0, oz_levels: 0, td_levels: 7, is_online: false },
      { id: 4, username: 'dave', duck_balance: 1, cc_levels: 2, oz_levels: 1, is_online: false },
    ];
    render(
      <UserTable
        users={users}
        onAdjustDucks={mockOnAdjustDucks}
        onResetPassword={mockOnResetPassword}
        onRemoveUser={mockOnRemoveUser}
      />
    );

    expect(screen.getByText('7')).toBeInTheDocument(); // 3D-only student
    expect(screen.getByText('3')).toBeInTheDocument(); // 2 + 1 + undefined td
  });
});
