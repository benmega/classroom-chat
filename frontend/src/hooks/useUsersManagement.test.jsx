import adminCache from '../utils/adminCache';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUsersManagement, buildUsersCacheKey } from './useUsersManagement';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';

const RealFormData = window.FormData;

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { showConfirm } from '../utils/confirm';

vi.mock('../utils/confirm', () => ({
    showConfirm: vi.fn()
}));

describe('useUsersManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminCache.clear();
    showConfirm.mockResolvedValue(true);

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

    
  });

  it('handles set drawer', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    const fakeEvent = { preventDefault: vi.fn(), target: {} };
    window.FormData = class { get(k) { return k === 'username' ? 'user' : '1A'; } };

    await act(async () => {
      await result.current.handleSetDrawer(fakeEvent);
    });
    
    
  });

  it('handles remove user', async () => {
    const { result } = renderHook(() => useUsersManagement());
    
    window.FormData = class { append() {} };

    await act(async () => {
      await result.current.handleRemoveUser('testuser');
    });
    
    
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
    showConfirm.mockResolvedValue(false);
    const { result } = renderHook(() => useUsersManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleRemoveUser('testuser');
    });

    // No success toast — action was cancelled
    
  });


  it('initializes from cache and revalidates in the background', async () => {
    const cachedUsersData = {
      users: [{ id: 99, username: 'cacheduser' }],
      total: 1,
      pages: 1,
      current_page: 1,
      stats: { online: 5, admins: 2, pending: 1 }
    };
    const key = buildUsersCacheKey('', 1, '', [], [], '', 'asc');
    adminCache.set(key, cachedUsersData);

    const { result } = renderHook(() => useUsersManagement());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.users).toEqual([{ id: 99, username: 'cacheduser' }]);
    expect(result.current.stats).toEqual({ online: 5, admins: 2, pending: 1 });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(result.current.users).toEqual([{ id: 1, username: 'testuser' }]);
  });

  it('invalidates admin_users cache on mutations', async () => {
    const key = buildUsersCacheKey('', 1, '', [], [], '', 'asc');
    adminCache.set(key, { users: [{ id: 1, username: 'u1' }], total: 1 });
    const { result } = renderHook(() => useUsersManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleRemoveUser('testuser');
    });

    expect(adminCache.get(key)).toBeNull();
  });
  it('offers to take over a drawer when the backend reports a conflict', async () => {
    // @api_response puts conflict/current_owner/message next to `error`, not under it
    const posted = [];
    server.use(
      http.post('*/api/admin/set_drawer', async ({ request }) => {
        const body = await request.json();
        posted.push(body);
        if (!body.force) {
          return HttpResponse.json({
            status: 'error',
            data: null,
            error: 'Drawer 0x09 is already assigned to @ada.',
            conflict: true,
            message: 'Drawer 0x09 is already assigned to @ada.',
            current_owner: 'ada',
          }, { status: 409 });
        }
        return HttpResponse.json({ status: 'success', data: { message: 'Drawer updated' }, error: null });
      })
    );
    const { result } = renderHook(() => useUsersManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    window.FormData = class { get(k) { return k === 'username' ? 'grace' : '0x09'; } };

    await act(async () => {
      await result.current.handleSetDrawer({ preventDefault: vi.fn(), target: {} });
    });

    expect(showConfirm).toHaveBeenCalledTimes(1);
    expect(showConfirm.mock.calls[0][0]).toContain('@ada');
    expect(posted).toEqual([
      { username: 'grace', drawer: '0x09' },
      { username: 'grace', drawer: '0x09', force: true },
    ]);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows the error message when setting a drawer fails without a conflict', async () => {
    server.use(
      http.post('*/api/admin/set_drawer', () => HttpResponse.json(
        { status: 'error', data: null, error: 'Drawer must be in hex format', message: 'Drawer must be in hex format' },
        { status: 400 }
      ))
    );
    const { result } = renderHook(() => useUsersManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    window.FormData = class { get(k) { return k === 'username' ? 'grace' : 'zz'; } };

    await act(async () => {
      await result.current.handleSetDrawer({ preventDefault: vi.fn(), target: {} });
    });

    expect(showConfirm).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Drawer must be in hex format');
  });

  describe('error handling and shared user actions', () => {
    // Earlier tests in this file swap window.FormData for stubs; these use the real one.
    beforeEach(() => {
      window.FormData = RealFormData;
    });

    const buildForm = (fields) => {
      const form = document.createElement('form');
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      return form;
    };
    const submitEvent = (fields) => ({ preventDefault: vi.fn(), target: buildForm(fields) });
    // @api_response error bodies carry a string `error`; extra keys (conflict, ...) sit beside it.
    const envelopeError = (error, status, extra = {}) => HttpResponse.json({ status: 'error', data: null, error, ...extra }, { status });

    const renderLoaded = async () => {
      const hook = renderHook(() => useUsersManagement());
      await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
      return hook;
    };

    describe('handleSetDrawer', () => {
      it('offers a take-over when the drawer belongs to someone else, then retries with force', async () => {
        const bodies = [];
        server.use(
          http.post('*/api/admin/set_drawer', async ({ request }) => {
            const body = await request.json();
            bodies.push(body);
            if (!body.force) {
              // set_drawer is an @api_response route, so the conflict fields sit next to `error`.
              return envelopeError('Drawer 0x05 is already assigned to @sam.', 409, { conflict: true, message: 'Drawer 0x05 is already assigned to @sam.', current_owner: 'sam' });
            }
            return HttpResponse.json({ status: 'success', data: { message: 'Drawer updated for kid' }, error: null });
          })
        );
        const { result } = await renderLoaded();
        act(() => result.current.setActiveModal('drawer'));

        await act(async () => {
          await result.current.handleSetDrawer(submitEvent({ username: 'kid', drawer: '5' }));
        });

        expect(showConfirm).toHaveBeenCalledTimes(1);
        expect(showConfirm).toHaveBeenCalledWith(
          expect.stringContaining('already assigned to @sam'),
          { title: 'Drawer Conflict', confirmText: 'Take Over', destructive: true }
        );
        expect(bodies).toEqual([
          { username: 'kid', drawer: '5' },
          { username: 'kid', drawer: '5', force: true },
        ]);
        expect(toast.error).not.toHaveBeenCalled();
        expect(result.current.activeModal).toBeNull();
        expect(result.current.formLoading).toBe(false);
      });

      it('leaves the drawer alone when the take-over is declined', async () => {
        showConfirm.mockResolvedValue(false);
        const bodies = [];
        server.use(
          http.post('*/api/admin/set_drawer', async ({ request }) => {
            bodies.push(await request.json());
            return envelopeError('Drawer 0x05 is already assigned to @sam.', 409, { conflict: true, message: 'Drawer 0x05 is already assigned to @sam.', current_owner: 'sam' });
          })
        );
        const { result } = await renderLoaded();
        act(() => result.current.setActiveModal('drawer'));

        await act(async () => {
          await result.current.handleSetDrawer(submitEvent({ username: 'kid', drawer: '5' }));
        });

        expect(showConfirm).toHaveBeenCalledTimes(1);
        expect(bodies).toHaveLength(1);
        expect(toast.error).not.toHaveBeenCalled();
        expect(result.current.activeModal).toBe('drawer');
      });

      it('shows the validation reason of an ordinary failure instead of a conflict prompt', async () => {
        server.use(
          http.post('*/api/admin/set_drawer', () => envelopeError('Drawer must be in hex format (e.g. 0xA6 or A6)', 400))
        );
        const { result } = await renderLoaded();

        await act(async () => {
          await result.current.handleSetDrawer(submitEvent({ username: 'kid', drawer: 'zz' }));
        });

        expect(showConfirm).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Drawer must be in hex format (e.g. 0xA6 or A6)');
      });

      it('falls back to a generic message when the failure carries no body', async () => {
        server.use(http.post('*/api/admin/set_drawer', () => new HttpResponse(null, { status: 500 })));
        const { result } = await renderLoaded();

        await act(async () => {
          await result.current.handleSetDrawer(submitEvent({ username: 'kid', drawer: '5' }));
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to set drawer.');
      });
    });

    describe('handleToggleChat', () => {
      it('reads the new chat flag from the enveloped response', async () => {
        server.use(
          http.post('*/api/admin/user/:id/toggle-chat', () => HttpResponse.json({
            status: 'success',
            data: { message: 'User testuser has been muted.', can_chat: false },
            error: null,
          }))
        );
        const { result } = await renderLoaded();

        await act(async () => { await result.current.handleToggleChat(1); });

        expect(result.current.users[0].can_chat).toBe(false);
        expect(toast.error).not.toHaveBeenCalled();
      });

      it("shows the server's reason when the toggle fails", async () => {
        server.use(http.post('*/api/admin/user/:id/toggle-chat', () => envelopeError('Admin access required', 403)));
        const { result } = await renderLoaded();

        await act(async () => { await result.current.handleToggleChat(1); });

        expect(toast.error).toHaveBeenCalledWith('Admin access required');
        expect(result.current.users[0].can_chat).toBeUndefined();
      });
    });

    describe('handleToggleChildLink', () => {
      it("shows the server's reason when linking fails", async () => {
        server.use(
          http.post('*/api/admin/parents/:id/:action/:childId', () => HttpResponse.json({ success: false, message: 'Student not found' }, { status: 404 }))
        );
        const { result } = await renderLoaded();

        await act(async () => { await result.current.handleToggleChildLink(1, 2, false); });

        expect(toast.error).toHaveBeenCalledWith('Student not found');
        expect(result.current.formLoading).toBe(false);
      });
    });

    describe('handleCreateUser', () => {
      it('shows an inline error for a malformed username and never calls the server', async () => {
        let posts = 0;
        server.use(http.post('*/api/admin/create_user', () => { posts += 1; return HttpResponse.json({ success: true }); }));
        const { result } = await renderLoaded();

        await act(async () => {
          await result.current.handleCreateUser(submitEvent({ username: 'Bad Name!', password: 'pw' }));
        });

        expect(result.current.formErrors).toEqual({ username: '3-30 chars, lowercase, numbers, or underscores.' });
        expect(posts).toBe(0);
      });

      it('creates the user, closes the modal and reloads the list', async () => {
        let fetches = 0;
        server.use(
          http.get('*/api/admin/users', () => { fetches += 1; return HttpResponse.json({ users: [], total: 0, pages: 1, current_page: 1 }); }),
          http.post('*/api/admin/create_user', () => HttpResponse.json({ success: true, message: 'created' }))
        );
        const { result } = await renderLoaded();
        act(() => result.current.setActiveModal('create'));
        const before = fetches;

        await act(async () => {
          await result.current.handleCreateUser(submitEvent({ username: 'newkid', password: 'x', ducks: '0' }));
        });

        expect(result.current.activeModal).toBeNull();
        expect(result.current.formErrors).toEqual({});
        await waitFor(() => expect(fetches).toBeGreaterThan(before));
      });

      it("shows the server's reason and keeps the modal open", async () => {
        server.use(http.post('*/api/admin/create_user', () => HttpResponse.json({ success: false, message: 'Username already exists' }, { status: 409 })));
        const { result } = await renderLoaded();
        act(() => result.current.setActiveModal('create'));

        await act(async () => {
          await result.current.handleCreateUser(submitEvent({ username: 'taken', password: 'pw' }));
        });

        expect(toast.error).toHaveBeenCalledWith('Username already exists');
        expect(result.current.activeModal).toBe('create');
        expect(result.current.formLoading).toBe(false);
      });
    });

    describe('handleAdjustDucks and handleAdjustPackets', () => {
      it.each([
        ['handleAdjustDucks', 'adjust_ducks', () => HttpResponse.json({ success: false, message: "User 'kid' not found." }, { status: 404 }), "User 'kid' not found."],
        ['handleAdjustPackets', 'adjust_packets', () => new HttpResponse(null, { status: 500 }), 'Failed to adjust packets.'],
      ])('%s requires an amount and shows the failure', async (handler, endpoint, failure, expectedToast) => {
        server.use(http.post(`*/api/admin/${endpoint}`, failure));
        const { result } = await renderLoaded();

        await act(async () => { await result.current[handler](submitEvent({ username: 'kid', amount: '' })); });
        expect(result.current.formErrors).toEqual({ amount: 'Adjustment amount is required' });
        expect(toast.error).not.toHaveBeenCalled();

        await act(async () => { await result.current[handler](submitEvent({ username: 'kid', amount: '3' })); });
        expect(toast.error).toHaveBeenCalledWith(expectedToast);
        expect(result.current.formErrors).toEqual({});
      });

      it.each(['handleAdjustDucks', 'handleAdjustPackets'])('%s closes the modal and reloads on success', async (handler) => {
        server.use(
          http.post('*/api/admin/adjust_ducks', () => HttpResponse.json({ success: true })),
          http.post('*/api/admin/adjust_packets', () => HttpResponse.json({ success: true }))
        );
        const { result } = await renderLoaded();
        act(() => result.current.setActiveModal('adjust'));

        await act(async () => { await result.current[handler](submitEvent({ username: 'kid', amount: '3' })); });

        expect(result.current.activeModal).toBeNull();
        expect(toast.error).not.toHaveBeenCalled();
      });
    });

    describe('handleResetPassword', () => {
      it('sends only the username and new password as JSON', async () => {
        const bodies = [];
        server.use(
          http.post('*/api/admin/reset_password', async ({ request }) => {
            bodies.push(await request.json());
            return HttpResponse.json({ success: true });
          })
        );
        const { result } = await renderLoaded();
        act(() => result.current.setActiveModal('reset'));

        await act(async () => {
          await result.current.handleResetPassword(submitEvent({ username: 'kid', new_password: 'pw', confirm_password: 'pw' }));
        });

        expect(bodies).toEqual([{ username: 'kid', new_password: 'pw' }]);
        expect(result.current.activeModal).toBeNull();
      });

      it('rejects a mismatch inline and shows server reasons otherwise', async () => {
        server.use(
          http.post('*/api/admin/reset_password', () => HttpResponse.json({ success: false, message: 'Cannot reset password of another admin' }, { status: 403 }))
        );
        const { result } = await renderLoaded();

        await act(async () => {
          await result.current.handleResetPassword(submitEvent({ username: 'boss', new_password: 'a', confirm_password: 'b' }));
        });
        expect(result.current.formErrors).toEqual({ confirm_password: 'Passwords do not match' });
        expect(toast.error).not.toHaveBeenCalled();

        await act(async () => {
          await result.current.handleResetPassword(submitEvent({ username: 'boss', new_password: 'a', confirm_password: 'a' }));
        });
        expect(toast.error).toHaveBeenCalledWith('Cannot reset password of another admin');
      });
    });

    describe('handleRemoveUser', () => {
      it('removes the user and reloads the list', async () => {
        let fetches = 0;
        server.use(
          http.get('*/api/admin/users', () => { fetches += 1; return HttpResponse.json({ users: [], total: 0, pages: 1, current_page: 1 }); })
        );
        const { result } = await renderLoaded();
        const before = fetches;

        await act(async () => { await result.current.handleRemoveUser('testuser'); });

        expect(showConfirm).toHaveBeenCalledWith(
          'Are you sure you want to PERMANENTLY remove @testuser? This cannot be undone.',
          { title: 'Remove User', confirmText: 'Remove', destructive: true }
        );
        await waitFor(() => expect(fetches).toBeGreaterThan(before));
      });

      it("shows the server's reason when the removal is refused", async () => {
        server.use(http.post('*/api/admin/remove_user', () => HttpResponse.json({ success: false, message: 'Cannot remove another admin' }, { status: 403 })));
        const { result } = await renderLoaded();

        await act(async () => { await result.current.handleRemoveUser('boss'); });

        expect(toast.error).toHaveBeenCalledWith('Cannot remove another admin');
      });
    });
  });


  describe('pagination', () => {
    // Pages of users the way the real endpoint serves them: it echoes the page that was asked for
    const servePages = ({ total = 120, perPage = 50 } = {}) => {
      const urls = [];
      server.use(
        http.get('*/api/admin/users', ({ request }) => {
          const url = new URL(request.url);
          urls.push(url);
          const page = Number(url.searchParams.get('page'));
          return HttpResponse.json({
            users: [{ id: page, username: `page${page}` }],
            total,
            pages: Math.ceil(total / perPage),
            current_page: page,
            stats: { online: 1, admins: 2, pending: 3 },
          });
        })
      );
      return urls;
    };
    const pageParams = (urls) => urls.map((url) => url.searchParams.get('page'));
    const quiet = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
    const renderLoaded = async (role) => {
      const hook = renderHook(() => useUsersManagement(role));
      await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
      return hook;
    };

    it('asks for the first page of 50 on mount, once, and reports the totals', async () => {
      const urls = servePages();

      const { result } = await renderLoaded();
      await quiet();

      expect(urls).toHaveLength(1);
      expect(urls[0].search).toMatch(/^\?page=1&per_page=50/);
      expect(result.current.page).toBe(1);
      expect(result.current.totalUsers).toBe(120);
      expect(result.current.totalPages).toBe(3);
      expect(result.current.stats).toEqual({ online: 1, admins: 2, pending: 3 });
    });

    it('requests a page exactly once when setPage moves to it', async () => {
      const urls = servePages();
      const { result } = await renderLoaded();

      act(() => result.current.setPage(2));
      await waitFor(() => expect(result.current.users[0].username).toBe('page2'));
      await quiet();

      expect(pageParams(urls)).toEqual(['1', '2']);
      expect(urls[1].search).toMatch(/^\?page=2&per_page=50/);
      expect(result.current.page).toBe(2);
    });

    it('steps back and forth without repeating requests', async () => {
      const urls = servePages();
      const { result } = await renderLoaded();

      act(() => result.current.setPage(2));
      await waitFor(() => expect(result.current.users[0].username).toBe('page2'));
      act(() => result.current.setPage(3));
      await waitFor(() => expect(result.current.users[0].username).toBe('page3'));
      act(() => result.current.setPage(2));
      await waitFor(() => expect(result.current.users[0].username).toBe('page2'));
      await quiet();

      expect(pageParams(urls)).toEqual(['1', '2', '3', '2']);
    });

    it('keeps the role in every page request', async () => {
      const urls = servePages();
      const { result } = await renderLoaded('student');

      act(() => result.current.setPage(2));
      await waitFor(() => expect(result.current.users[0].username).toBe('page2'));

      expect(urls.map((url) => url.searchParams.get('role'))).toEqual(['student', 'student']);
    });

    it.each([
      ['the status filter', (hook) => hook.setStatusFilter(['active']), 'status', 'active'],
      ['the account type filter', (hook) => hook.setAccountTypeFilter(['parent']), 'account_types', 'parent'],
      ['the sort column', (hook) => hook.setSortBy('name'), 'sort_by', 'name'],
      // A column is sorted first, so that flipping its direction is the only change that is made on page 3
      ['the sort direction', (hook) => hook.setSortDir('desc'), 'sort_dir', 'desc', (hook) => hook.setSortBy('name')],
    ])('goes back to page 1 when %s changes', async (_name, change, param, value, prepare) => {
      const urls = servePages();
      const { result } = await renderLoaded();
      if (prepare) {
        act(() => prepare(result.current));
        await waitFor(() => expect(urls[urls.length - 1].searchParams.get('sort_by')).toBe('name'));
        await quiet();
      }
      act(() => result.current.setPage(3));
      await waitFor(() => expect(result.current.users[0].username).toBe('page3'));
      expect(result.current.page).toBe(3);

      act(() => change(result.current));

      await waitFor(() => expect(result.current.page).toBe(1));
      await waitFor(() => expect(result.current.users[0].username).toBe('page1'));
      await quiet();
      const last = urls[urls.length - 1];
      expect(last.searchParams.get('page')).toBe('1');
      expect(last.searchParams.get(param)).toBe(value);
    });

    it('goes back to page 1 when the search term changes', async () => {
      const urls = servePages();
      const { result } = await renderLoaded();
      act(() => result.current.setPage(2));
      await waitFor(() => expect(result.current.users[0].username).toBe('page2'));

      act(() => result.current.setSearchTerm('amy'));

      await waitFor(() => expect(result.current.page).toBe(1), { timeout: 1500 });
      await waitFor(() => expect(result.current.users[0].username).toBe('page1'));
      const last = urls[urls.length - 1];
      expect(last.searchParams.get('page')).toBe('1');
      expect(last.searchParams.get('search')).toBe('amy');
    });

    it('treats a bare array response as a single page', async () => {
      server.use(http.get('*/api/admin/users', () => HttpResponse.json([{ id: 1 }, { id: 2 }])));

      const { result } = await renderLoaded();

      expect(result.current.users).toHaveLength(2);
      expect(result.current.totalUsers).toBe(2);
      expect(result.current.totalPages).toBe(1);
    });
  });

  describe('responses that arrive out of order', () => {
    // Each request waits for its own release, so a test decides in what order the answers arrive.
    // A search of 'fail' answers with a server error, anything else with one user named after the request.
    const holdRequests = () => {
      const held = [];
      server.use(
        http.get('*/api/admin/users', async ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search') || '';
          await new Promise((resolve) => held.push({ search, release: resolve }));
          if (search === 'fail') return new HttpResponse(null, { status: 500 });
          return HttpResponse.json({
            users: [{ id: 1, username: `for-${search || 'nothing'}` }],
            total: 1,
            pages: 1,
            current_page: 1,
          });
        })
      );
      return held;
    };
    const requestFor = (held, search) => held.find((entry) => entry.search === search);
    const mountAndAnswerFirstLoad = async (held) => {
      const hook = renderHook(() => useUsersManagement());
      await waitFor(() => expect(held).toHaveLength(1));
      requestFor(held, '').release();
      await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
      return hook;
    };
    // Types the two search terms one after the other, so two requests are in flight
    const searchTwice = async (hook, held, first, second) => {
      act(() => hook.result.current.setSearchTerm(first));
      await waitFor(() => expect(requestFor(held, first)).toBeDefined(), { timeout: 1500 });
      act(() => hook.result.current.setSearchTerm(second));
      await waitFor(() => expect(requestFor(held, second)).toBeDefined(), { timeout: 1500 });
    };
    const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });

    it('shows the answer to the latest request even when an older one answers last', async () => {
      const held = holdRequests();
      const hook = await mountAndAnswerFirstLoad(held);
      await searchTwice(hook, held, 'am', 'amy');

      // The newer request is answered first, the older one afterwards
      requestFor(held, 'amy').release();
      await waitFor(() => expect(hook.result.current.users[0]?.username).toBe('for-amy'));
      requestFor(held, 'am').release();
      await settle();

      expect(hook.result.current.users[0].username).toBe('for-amy');
      expect(hook.result.current.isRefreshing).toBe(false);
    });

    it('keeps the loading indicator up until the latest request is answered', async () => {
      const held = holdRequests();
      const hook = await mountAndAnswerFirstLoad(held);
      await searchTwice(hook, held, 'am', 'amy');

      // The older answer comes first: it is dropped and the newer one is still awaited
      requestFor(held, 'am').release();
      await settle();
      expect(hook.result.current.isRefreshing).toBe(true);
      expect(hook.result.current.users[0].username).toBe('for-nothing');

      requestFor(held, 'amy').release();
      await waitFor(() => expect(hook.result.current.users[0].username).toBe('for-amy'));
      expect(hook.result.current.isRefreshing).toBe(false);
    });

    it('does not let an older request that failed toast over a newer one that worked', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const held = holdRequests();
      const hook = await mountAndAnswerFirstLoad(held);
      await searchTwice(hook, held, 'fail', 'amy');

      requestFor(held, 'amy').release();
      await waitFor(() => expect(hook.result.current.users[0]?.username).toBe('for-amy'));
      requestFor(held, 'fail').release();
      await settle();

      expect(toast.error).not.toHaveBeenCalled();
      expect(hook.result.current.users[0].username).toBe('for-amy');
      expect(hook.result.current.isRefreshing).toBe(false);
      console.error.mockRestore();
    });

    it('still toasts when the latest request is the one that fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const held = holdRequests();
      const hook = await mountAndAnswerFirstLoad(held);
      await searchTwice(hook, held, 'amy', 'fail');

      requestFor(held, 'amy').release();
      requestFor(held, 'fail').release();
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load users list.'));

      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(hook.result.current.isRefreshing).toBe(false);
      console.error.mockRestore();
    });
  });

});
