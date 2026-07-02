import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUsersManagement } from './useUsersManagement';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useUsersManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);

    server.use(
      http.get('*/api/admin/users', ({ request }) => {
        const url = new URL(request.url);
        const search = url.searchParams.get('search');
        
        if (search === 'error') {
          return new HttpResponse(null, { status: 500 });
        }
        
        return HttpResponse.json({
          users: [{ id: 1, username: 'testuser' }],
          total: 1,
          pages: 1,
          current_page: 1
        });
      }),
      http.post('*/api/admin/create_user', () => {
        return HttpResponse.json({ success: true, message: 'User created' });
      }),
      http.post('*/api/admin/adjust_ducks', () => {
        return HttpResponse.json({ success: true, message: 'Ducks adjusted' });
      }),
      http.post('*/api/admin/adjust_packets', () => {
        return HttpResponse.json({ success: true, message: 'Packets adjusted' });
      }),
      http.post('*/api/admin/reset_password', () => {
        return HttpResponse.json({ success: true, message: 'Password reset' });
      }),
      http.post('*/api/admin/set_drawer', () => {
        return HttpResponse.json({ success: true, message: 'Drawer set' });
      }),
      http.post('*/api/admin/remove_user', () => {
        return HttpResponse.json({ success: true, message: 'User removed' });
      }),
      http.get('*/api/admin/parents/:id/children', () => {
        return HttpResponse.json({ success: true, children: [{ id: 2, username: 'child' }] });
      }),
      http.post('*/api/admin/parents/:id/:action/:childId', () => {
        return HttpResponse.json({ success: true, message: 'Link toggled' });
      }),
      http.get('*/api/admin/user/:id/connection_card', () => {
        return HttpResponse.json({ connection_code: 'CODE123' });
      }),
      http.get('*/api/admin/classrooms', () => {
        return HttpResponse.json({ classrooms: [{ id: 1, name: 'Class 1' }] });
      }),
      http.get('*/api/admin/classrooms/:id/connection_cards', () => {
        return HttpResponse.json({ cards: [{ student: 'A', code: '123' }] });
      })
    );
  });

  it('fetches users on mount', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.users.length).toBe(1);
    expect(result.current.totalUsers).toBe(1);
  });

  it('handles user creation', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    const fakeEvent = {
      preventDefault: vi.fn(),
      target: {
        elements: { username: { value: 'newuser' }, password: { value: 'pass' } }
      }
    };
    
    // Polyfill FormData for the test
    window.FormData = class {
      constructor() { this.data = new Map(); }
      append(k, v) { this.data.set(k, v); }
      get(k) { return this.data.get(k) || (fakeEvent.target.elements[k] ? fakeEvent.target.elements[k].value : null); }
      set(k, v) { this.data.set(k, v); }
    };

    await act(async () => {
      await result.current.handleCreateUser(fakeEvent);
    });
    
    expect(toast.success).toHaveBeenCalledWith('User created');
  });

  it('validates user creation fields', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    const fakeEvent = {
      preventDefault: vi.fn(),
      target: { elements: {} }
    };
    
    window.FormData = class {
      get() { return ''; }
      set() {}
    };

    await act(async () => {
      await result.current.handleCreateUser(fakeEvent);
    });
    
    expect(result.current.formErrors.username).toBe('Username is required');
  });

  it('handles adjust ducks', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    const fakeEvent = { preventDefault: vi.fn(), target: {} };
    window.FormData = class { get() { return '10'; } };

    await act(async () => {
      await result.current.handleAdjustDucks(fakeEvent);
    });
    
    expect(toast.success).toHaveBeenCalledWith('Ducks adjusted');
  });

  it('validates adjust ducks amount', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    const fakeEvent = { preventDefault: vi.fn(), target: {} };
    window.FormData = class { get() { return ''; } };

    await act(async () => {
      await result.current.handleAdjustDucks(fakeEvent);
    });
    
    expect(result.current.formErrors.amount).toBe('Adjustment amount is required');
  });

  it('handles adjust packets', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    const fakeEvent = { preventDefault: vi.fn(), target: {} };
    window.FormData = class { get() { return '10'; } };

    await act(async () => {
      await result.current.handleAdjustPackets(fakeEvent);
    });
    
    expect(toast.success).toHaveBeenCalledWith('Packets adjusted');
  });

  it('validates reset password - passwords do not match', async () => {
    const { result } = renderHook(() => useUsersManagement());

    // Build a FormData-like object that satisfies Object.fromEntries
    const makeFormData = (entries) => ({
      [Symbol.iterator]: function* () { for (const e of entries) yield e; }
    });
    const fakeFormData = makeFormData([['new_password', '123'], ['confirm_password', '456']]);
    window.FormData = vi.fn(() => fakeFormData);

    const fakeEvent = { preventDefault: vi.fn(), target: {} };

    await act(async () => {
      await result.current.handleResetPassword(fakeEvent);
    });

    expect(result.current.formErrors.confirm_password).toBe('Passwords do not match');
  });

  it('handles reset password success - passwords match', async () => {
    const { result } = renderHook(() => useUsersManagement());

    const makeFormData = (entries) => ({
      [Symbol.iterator]: function* () { for (const e of entries) yield e; }
    });
    const fakeFormData = makeFormData([
      ['username', 'testuser'],
      ['new_password', 'secret123'],
      ['confirm_password', 'secret123'],
    ]);
    window.FormData = vi.fn(() => fakeFormData);

    const fakeEvent = { preventDefault: vi.fn(), target: {} };

    await act(async () => {
      await result.current.handleResetPassword(fakeEvent);
    });

    expect(toast.success).toHaveBeenCalledWith('Password reset');
  });

  it('handles set drawer', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    const fakeEvent = { preventDefault: vi.fn(), target: {} };
    window.FormData = class { get(k) { return k === 'username' ? 'user' : '1A'; } };

    await act(async () => {
      await result.current.handleSetDrawer(fakeEvent);
    });
    
    expect(toast.success).toHaveBeenCalledWith('Drawer set');
  });

  it('handles remove user', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    window.FormData = class { append() {} };

    await act(async () => {
      await result.current.handleRemoveUser('testuser');
    });
    
    expect(toast.success).toHaveBeenCalledWith('User removed');
  });

  it('fetches parent children', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    await act(async () => {
      await result.current.fetchParentChildren(1);
    });
    
    expect(result.current.parentChildren.length).toBe(1);
    expect(result.current.parentChildren[0].username).toBe('child');
  });

  it('toggles child link', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    await act(async () => {
      await result.current.handleToggleChildLink(1, 2, false);
    });
    
    expect(toast.success).toHaveBeenCalledWith('Link toggled');
  });

  it('fetches connection card', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    let success;
    await act(async () => {
      success = await result.current.fetchConnectionCard(1);
    });
    
    expect(success).toBe(true);
    expect(result.current.connectionCode).toBe('CODE123');
  });

  it('fetches classrooms and cards', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    await act(async () => {
      await result.current.fetchClassrooms();
    });
    expect(result.current.classrooms.length).toBe(1);
    
    await act(async () => {
      await result.current.fetchClassroomCards(1);
    });
    expect(result.current.classroomCards.length).toBe(1);
  });
  
  it('updates debounced search term and triggers a refetch', async () => {
    let fetchCount = 0;
    server.use(
      http.get('*/api/admin/users', () => {
        fetchCount++;
        return HttpResponse.json({ users: [], total: 0, pages: 1, current_page: 1 });
      })
    );

    const { result } = renderHook(() => useUsersManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialFetchCount = fetchCount;

    act(() => {
      result.current.setSearchTerm('hello');
    });

    // Wait for debounce (300ms) and subsequent fetch
    await waitFor(() => {
      expect(fetchCount).toBeGreaterThan(initialFetchCount);
    }, { timeout: 1000 });
  });

  it('cancels remove user when confirm is dismissed', async () => {
    window.confirm = vi.fn(() => false);
    const { result } = renderHook(() => useUsersManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleRemoveUser('testuser');
    });

    // No success toast — action was cancelled
    expect(toast.success).not.toHaveBeenCalled();
  });

});
