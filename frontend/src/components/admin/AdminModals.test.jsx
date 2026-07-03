import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateUserModal, AdjustDucksModal, AdjustPacketsModal, SetDrawerModal, ResetPasswordModal, StartConversationModal, ManageChildrenModal, ConnectionCardModal, BulkConnectionCardsModal } from './AdminModals';

describe('AdminModals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateUserModal', () => {
    it('renders and submits correctly', async () => {
      const onClose = vi.fn();
      const onSubmit = vi.fn((e) => e.preventDefault());
      
      render(
        <CreateUserModal 
          isOpen={true} 
          onClose={onClose} 
          onSubmit={onSubmit} 
          formErrors={{}} 
          loading={false} 
        />
      );

      expect(screen.getByText('Create New User')).toBeInTheDocument();
      
      const usernameInput = document.querySelector('input[name="username"]');
      const passwordInput = document.querySelector('input[name="password"]');
      
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(passwordInput, 'password123');
      
      const toggleBtn = screen.getAllByRole('button').find(b => b.tabIndex === -1);
      await userEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');
      await userEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'password');

      await userEvent.click(screen.getByRole('button', { name: 'Create User' }));
      expect(onSubmit).toHaveBeenCalled();
    });

    it('shows errors and loading state', () => {
      render(
        <CreateUserModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSubmit={vi.fn()} 
          formErrors={{ username: 'Username is taken', password: 'Password too short' }} 
          loading={true} 
        />
      );

      expect(screen.getByText('Username is taken')).toBeInTheDocument();
      expect(screen.getByText('Password too short')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
    });
  });

  describe('AdjustDucksModal', () => {
    const users = [
      { id: '1', username: 'user1', duck_balance: 10 },
      { id: '2', username: 'user2', duck_balance: 5 }
    ];

    it('renders with specific user', () => {
      render(
        <AdjustDucksModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSubmit={vi.fn()} 
          user={users[0]} 
          users={users} 
          formErrors={{}} 
          loading={false} 
        />
      );

      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('@user1')).toBeInTheDocument();
      expect(document.querySelector('input[name="amount"]')).toBeInTheDocument();
    });

    it('renders with select when no specific user', async () => {
      const onSubmit = vi.fn((e) => e.preventDefault());
      render(
        <AdjustDucksModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSubmit={onSubmit} 
          user={null} 
          users={users} 
          formErrors={{}} 
          loading={false} 
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      expect(screen.getByText('user1 (Balance: 🦆 10.0)')).toBeInTheDocument();

      await userEvent.selectOptions(screen.getByRole('combobox'), 'user1');
      await userEvent.type(document.querySelector('input[name="amount"]'), '5');
      await userEvent.click(screen.getByRole('button', { name: 'Apply Adjustment' }));

      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('AdjustPacketsModal', () => {
    const users = [
      { id: '1', username: 'user1', packets: 2.5 }
    ];

    it('renders and submits', async () => {
      const onSubmit = vi.fn((e) => e.preventDefault());
      render(
        <AdjustPacketsModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSubmit={onSubmit} 
          user={users[0]} 
          users={users} 
          formErrors={{}} 
          loading={false} 
        />
      );

      expect(screen.getByText('user1')).toBeInTheDocument();
      await userEvent.type(document.querySelector('input[name="amount"]'), '1.5');
      await userEvent.click(screen.getByRole('button', { name: 'Apply Adjustment' }));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('SetDrawerModal', () => {
    it('renders and submits', async () => {
      const user = { username: 'draweruser', drawer: '0x01' };
      const onSubmit = vi.fn((e) => e.preventDefault());
      
      render(
        <SetDrawerModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSubmit={onSubmit} 
          user={user} 
          loading={false} 
        />
      );

      const drawerInput = document.querySelector('input[name="drawer"]');
      expect(drawerInput).toHaveValue('0x01');
      
      await userEvent.clear(drawerInput);
      await userEvent.type(drawerInput, '0xA6');
      
      await userEvent.click(screen.getByRole('button', { name: 'Set Drawer' }));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('ResetPasswordModal', () => {
    it('renders and toggles passwords', async () => {
      const user = { username: 'resetuser' };
      const onSubmit = vi.fn((e) => e.preventDefault());

      render(
        <ResetPasswordModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSubmit={onSubmit} 
          user={user} 
          formErrors={{}} 
          loading={false} 
        />
      );

      const newPassInput = document.querySelector('input[name="new_password"]');
      const confirmPassInput = document.querySelector('input[name="confirm_password"]');

      expect(newPassInput).toHaveAttribute('type', 'password');
      
      const toggleBtns = screen.getAllByRole('button').filter(b => b.tabIndex === -1);
      
      await userEvent.click(toggleBtns[0]);
      expect(newPassInput).toHaveAttribute('type', 'text');
      
      await userEvent.click(toggleBtns[1]);
      expect(confirmPassInput).toHaveAttribute('type', 'text');

      await userEvent.type(newPassInput, 'newpass');
      await userEvent.type(confirmPassInput, 'newpass');
      await userEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('StartConversationModal', () => {
    it('renders classrooms and submits', async () => {
      const classrooms = [{ id: 'global', name: 'Global' }, { id: 'class1', name: 'Class 1' }];
      const onSubmit = vi.fn((e) => e.preventDefault());

      render(
        <StartConversationModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onSubmit={onSubmit} 
          loading={false} 
          classrooms={classrooms} 
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Global (Announcements)')).toBeInTheDocument();
      expect(screen.getByText('Class 1')).toBeInTheDocument();

      await userEvent.selectOptions(screen.getByRole('combobox'), 'class1');
      await userEvent.type(document.querySelector('input[name="title"]'), 'Test Topic');
      await userEvent.click(screen.getByRole('button', { name: 'Start Conversation' }));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('ManageChildrenModal', () => {
    const users = [
      { id: 'student1', role: 'student', username: 'stud1' },
      { id: 'student2', role: 'student', username: 'stud2' },
      { id: 'admin1', role: 'admin', username: 'admin1' }
    ];
    const parentChildren = [{ id: 'student1' }];

    it('renders and toggles link', async () => {
      const parent = { id: 'parent1', username: 'parentuser' };
      const onToggleLink = vi.fn();

      render(
        <ManageChildrenModal 
          isOpen={true} 
          onClose={vi.fn()} 
          parent={parent}
          users={users}
          parentChildren={parentChildren}
          onToggleLink={onToggleLink}
          loading={false}
        />
      );

      expect(screen.getByText('Manage Children: parentuser')).toBeInTheDocument();
      expect(screen.getByText('stud1')).toBeInTheDocument();
      expect(screen.getByText('stud2')).toBeInTheDocument();
      expect(screen.queryByText('admin1')).not.toBeInTheDocument();

      const unlinkBtn = screen.getByRole('button', { name: 'Unlink' });
      const linkBtn = screen.getByRole('button', { name: 'Link' });

      await userEvent.click(unlinkBtn);
      expect(onToggleLink).toHaveBeenCalledWith('parent1', 'student1', true);

      await userEvent.click(linkBtn);
      expect(onToggleLink).toHaveBeenCalledWith('parent1', 'student2', false);
    });
  });

  describe('ConnectionCardModal', () => {
    it('renders with student and code', () => {
      const student = { username: 'conn_stud' };
      render(
        <ConnectionCardModal 
          isOpen={true} 
          onClose={vi.fn()} 
          student={student} 
          connectionCode="ABC-123" 
        />
      );

      expect(screen.getByText('conn_stud')).toBeInTheDocument();
      expect(screen.getByText('@conn_stud')).toBeInTheDocument();
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
    });
  });

  describe('BulkConnectionCardsModal', () => {
    const classrooms = [{ id: 'c1', name: 'Class 1' }];

    it('renders and handles selections', async () => {
      const fetchClassrooms = vi.fn();
      const fetchClassroomCards = vi.fn();
      const setClassroomCards = vi.fn();

      const { rerender } = render(
        <BulkConnectionCardsModal 
          isOpen={true} 
          onClose={vi.fn()} 
          classrooms={classrooms}
          fetchClassrooms={fetchClassrooms}
          classroomCards={[]}
          setClassroomCards={setClassroomCards}
          isFetchingCards={false}
          fetchClassroomCards={fetchClassroomCards}
        />
      );

      expect(fetchClassrooms).toHaveBeenCalled();

      await waitFor(() => {
        expect(setClassroomCards).toHaveBeenCalledWith([]);
      });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'c1');
      expect(fetchClassroomCards).toHaveBeenCalledWith('c1');

      rerender(
        <BulkConnectionCardsModal 
          isOpen={true} 
          onClose={vi.fn()} 
          classrooms={classrooms}
          fetchClassrooms={fetchClassrooms}
          classroomCards={[{ id: 'card1', username: 'stud1', connection_code: 'XYZ-987' }]}
          setClassroomCards={setClassroomCards}
          isFetchingCards={false}
          fetchClassroomCards={fetchClassroomCards}
        />
      );

      expect(screen.getByText('stud1')).toBeInTheDocument();
      expect(screen.getByText('XYZ-987')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Print 1 Cards' })).toBeInTheDocument();
    });
  });
});
