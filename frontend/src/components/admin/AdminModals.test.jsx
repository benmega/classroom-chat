import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateUserModal, AdjustDucksModal, AdjustPacketsModal, SetDrawerModal, ResetPasswordModal, ManageChildrenModal, ConnectionCardModal, BulkConnectionCardsModal, AddCourseModal } from './AdminModals';

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
      
      const toggleBtn = screen.getByRole('button', { name: 'Show password' });
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
      
      const toggleBtns = [
        screen.getByRole('button', { name: 'Show new password' }),
        screen.getByRole('button', { name: 'Show confirm password' }),
      ];

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

  describe('accessibility', () => {
    const users = [{ id: '1', username: 'user1', duck_balance: 10, packets: 2 }];

    it('lets keyboard users reach the password toggle and tells screen readers whether the password is shown', async () => {
      const user = userEvent.setup();
      render(<CreateUserModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} formErrors={{}} loading={false} />);
      const passwordInput = document.querySelector('input[name="password"]');
      const toggle = screen.getByRole('button', { name: 'Show password' });

      expect(toggle).not.toHaveAttribute('tabindex', '-1');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      passwordInput.focus();
      await user.tab();
      expect(toggle).toHaveFocus();

      await user.keyboard('{Enter}');

      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('names both password toggles of the reset form and reaches them in order', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} user={{ username: 'u' }} formErrors={{}} loading={false} />);

      document.querySelector('input[name="new_password"]').focus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Show new password' })).toHaveFocus();
      await user.tab();
      expect(document.querySelector('input[name="confirm_password"]')).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Show confirm password' })).toHaveFocus();
      await user.keyboard(' ');

      expect(screen.getByRole('button', { name: 'Show confirm password' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Show new password' })).toHaveAttribute('aria-pressed', 'false');
    });

    const adjustModals = [
      ['AdjustDucksModal', (props) => <AdjustDucksModal {...props} />],
      ['AdjustPacketsModal', (props) => <AdjustPacketsModal {...props} />],
    ];
    const adjustProps = { isOpen: true, onClose: vi.fn(), onSubmit: vi.fn(), users, formErrors: {}, loading: false };

    it.each(adjustModals)('%s labels the user select when there is no specific user', (_name, renderModal) => {
      render(renderModal({ ...adjustProps, user: null }));

      expect(screen.getByLabelText('Target User')).toBe(screen.getByRole('combobox'));
    });

    it.each(adjustModals)('%s names the user badge instead of pointing a label at a hidden input', (_name, renderModal) => {
      render(renderModal({ ...adjustProps, user: users[0] }));

      const badge = screen.getByRole('group', { name: 'Target User' });
      expect(badge).toHaveTextContent('@user1');
      expect(screen.getByText('Target User').tagName).not.toBe('LABEL');
      expect(document.querySelector('input[type="hidden"]')).toHaveValue('user1');
    });

    it('names the list of students in the manage-children dialog', () => {
      render(
        <ManageChildrenModal
          isOpen
          onClose={vi.fn()}
          parent={{ id: 'p', username: 'pat' }}
          users={[{ id: 's1', role: 'student', username: 'stud1' }]}
          parentChildren={[]}
          onToggleLink={vi.fn()}
          loading={false}
        />
      );

      const list = screen.getByRole('group', { name: 'Select Students to Link' });
      expect(list).toHaveTextContent('stud1');
      expect(document.querySelector('label[for="input-280"]')).toBeNull();
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
    it('renders and fetches data on open', async () => {
      const fetchClassroomCards = vi.fn();

      const { rerender } = render(
        <BulkConnectionCardsModal 
          isOpen={true} 
          onClose={vi.fn()} 
          classroomCards={[]}
          isFetchingCards={false}
          fetchClassroomCards={fetchClassroomCards}
        />
      );

      expect(fetchClassroomCards).toHaveBeenCalled();

      rerender(
        <BulkConnectionCardsModal 
          isOpen={true} 
          onClose={vi.fn()} 
          classroomCards={[{ id: 'card1', username: 'stud1', connection_code: 'XYZ-987' }]}
          isFetchingCards={false}
          fetchClassroomCards={fetchClassroomCards}
        />
      );

      expect(screen.getByText('stud1')).toBeInTheDocument();
      expect(screen.getByText('XYZ-987')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Print 1 Cards' })).toBeInTheDocument();
    });
  });

  describe('AddCourseModal', () => {
    it('renders course options and handles submission', async () => {
      const onClose = vi.fn();
      const onSubmit = vi.fn();
      const courses = [
        { id: 'course-py', name: 'Python Basics' },
        { id: 'course-js', name: 'JavaScript Basics' }
      ];

      render(
        <AddCourseModal
          isOpen={true}
          onClose={onClose}
          onSubmit={onSubmit}
          courses={courses}
          loading={false}
        />
      );

      expect(screen.getByText('Connect Course to Classroom')).toBeInTheDocument();

      const select = screen.getByLabelText('Select Course');
      await userEvent.selectOptions(select, 'course-py');

      const instanceInput = screen.getByLabelText(/Instance ID/i);
      await userEvent.type(instanceInput, 'inst-123');

      const submitBtn = screen.getByRole('button', { name: 'Connect Course' });
      await userEvent.click(submitBtn);

      expect(onSubmit).toHaveBeenCalledWith({
        course_id: 'course-py',
        instance_id: 'inst-123'
      });
    });

    it.skip('allows entering custom course ID', async () => {
      const onSubmit = vi.fn();

      render(
        <AddCourseModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          courses={[]}
          loading={false}
        />
      );

      const select = screen.getByLabelText('Select Course');
      await userEvent.selectOptions(select, 'custom');

      const customInput = screen.getByLabelText('Custom Course ID');
      await userEvent.type(customInput, 'Custom_Python_101');

      const submitBtn = screen.getByRole('button', { name: 'Connect Course' });
      await userEvent.click(submitBtn);

      expect(onSubmit).toHaveBeenCalledWith({
        course_id: 'Custom_Python_101',
        instance_id: undefined
      });
    });
  });
});
