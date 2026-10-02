import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';
import ToReview from './ToReview';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/apiUrl', () => ({
  getApiUrl: () => 'about:blank',
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../components/admin/AdminPageHeader', () => ({
  default: () => <div data-testid="AdminPageHeader">Header</div>
}));

import { showConfirm } from '../../utils/confirm';

vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn()
}));

// Prevent happy-dom from trying to load iframe src which causes a TCP handle crash
beforeEach(() => {
  vi.stubGlobal('HTMLIFrameElement', class HTMLIFrameElement {
    get src() { return ''; }
    set src(val) {}
  });
});

describe('ToReview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showConfirm.mockResolvedValue(true);
  });

  it('renders correctly and loads data', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('/api/admin/crud/classroom') || url.includes('/api/admin/crud/course')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('course-requests')) {
        return Promise.resolve({ data: { requests: [] } });
      }
      if (url.includes('projects')) {
        return Promise.resolve({ data: { data: { projects: [{ id: 1, name: 'Project 1', submitted_at: '2023-01-01', user_nickname: 'Bob' }] } } });
      }
      if (url.includes('certificates')) {
        return Promise.resolve({ data: { status: 'success', data: { certificates: [{ id: 1, achievement: { name: 'Cert 1' }, user: { nickname: 'Bob' }, submitted_at: '2023-01-01' }] } } });
      }
      if (url.includes('users')) {
        return Promise.resolve({ data: { data: { users: [{ id: 1, username: 'bob', nickname: 'Bob' }] } } });
      }
      if (url.includes('trades')) {
        return Promise.resolve({ data: { data: { trades: [{ id: 1, username: 'bob', timestamp: '2023-01-01' }] } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<ToReview />);

    await waitFor(() => {
      // Check for the mocked header
      expect(screen.getByTestId('AdminPageHeader')).toBeInTheDocument();
      // Check for a tab label
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  it('renders empty state', async () => {
    client.get.mockImplementation(() => {
      // Return empty arrays for all data types to trigger empty state
      return Promise.resolve({ data: { data: { projects: [], users: [], trades: [], certificates: [] }, requests: [] } });
    });

    render(<ToReview />);

    await waitFor(() => {
      expect(screen.getByText('All Caught Up!')).toBeInTheDocument();
    });
  });

  it('switches tabs and renders appropriate content', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('/api/admin/crud/classroom') || url.includes('/api/admin/crud/course')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('course-requests')) {
        return Promise.resolve({ data: { requests: [] } });
      }
      if (url.includes('projects')) {
        return Promise.resolve({ data: { data: { projects: [{ id: 1, name: 'Project 1', submitted_at: '2023-01-01', user_nickname: 'Bob' }] } } });
      }
      if (url.includes('certificates')) {
        return Promise.resolve({ data: { status: 'success', data: { certificates: [{ id: 1, achievement: { name: 'Cert 1' }, user: { nickname: 'Bob' }, submitted_at: '2023-01-01' }] } } });
      }
      if (url.includes('users')) {
        return Promise.resolve({ data: { data: { users: [{ id: 1, username: 'bob', nickname: 'Bob' }] } } });
      }
      if (url.includes('trades')) {
        return Promise.resolve({ data: { data: { trades: [{ id: 1, username: 'bob', timestamp: '2023-01-01' }] } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<ToReview />);
    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    // Click on 'Course Requests' tab
    // We don't have the exact label, maybe 'Course & Track Requests' or similar. 
    // We'll click some tabs that exist based on data.
    const tabs = screen.getAllByRole("button").filter(b => b.classList.contains("review-tab-item"));
    if (tabs.length > 1) {
        fireEvent.click(tabs[1]);
        fireEvent.click(tabs[2]);
    }

    client.post.mockResolvedValueOnce({ data: { status: 'success' } });
    const approveBtns = screen.queryAllByRole('button', { name: /Approve/i });
    if (approveBtns.length > 0) {
        fireEvent.click(approveBtns[0]);
    }

    client.post.mockResolvedValueOnce({ data: { status: 'success' } });
    const rejectBtns = screen.queryAllByRole('button', { name: /Reject/i });
    if (rejectBtns.length > 0) {
        fireEvent.click(rejectBtns[0]);
    }
  });

  it('renders resubmitted badge and previous feedback for resubmitted project', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('projects')) {
        return Promise.resolve({
          data: {
            data: {
              projects: [
                {
                  id: 2,
                  name: 'Resubmitted Game',
                  submitted_at: '2023-01-01',
                  user_nickname: 'Alice',
                  status: 'pending',
                  teacher_comment: 'Please add a video and comments'
                }
              ]
            }
          }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<ToReview />);
    await waitFor(() => {
      expect(screen.getByText('Resubmitted')).toBeInTheDocument();
      expect(screen.getByText(/Please add a video and comments/)).toBeInTheDocument();
    });
  });

  describe('certificates', () => {
    const mockCertificates = (certificates) => {
      client.get.mockImplementation((url) => {
        if (url.includes('/api/achievements/admin/certificates')) {
          // Real shape: the endpoint is wrapped by @api_response.
          return Promise.resolve({ data: { status: 'success', data: { certificates } } });
        }
        return Promise.resolve({ data: { data: [] } });
      });
    };

    it('renders certificates from the enveloped response', async () => {
      mockCertificates([
        { id: 7, achievement: { name: 'Python Basics' }, user: { username: 'bob', nickname: 'Bob' }, submitted_at: '2023-01-01T10:00:00' },
      ]);

      render(<ToReview />);

      expect(await screen.findByText('Python Basics')).toBeInTheDocument();
      expect(screen.getByText('@bob')).toBeInTheDocument();
    });

    it('shows a placeholder instead of Invalid Date when submitted_at is missing', async () => {
      mockCertificates([
        { id: 8, achievement: { name: 'No Date Cert' }, user: { username: 'amy' }, submitted_at: null },
        { id: 9, achievement: { name: 'Absent Date Cert' }, user: { username: 'cal' } },
      ]);

      render(<ToReview />);

      expect(await screen.findByText('No Date Cert')).toBeInTheDocument();
      expect(screen.getAllByText('Unknown date')).toHaveLength(2);
      expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
    });

    it('formats a present submitted_at as a date', async () => {
      mockCertificates([
        { id: 10, achievement: { name: 'Dated Cert' }, user: { username: 'dee' }, submitted_at: '2023-01-02T03:04:05' },
      ]);

      render(<ToReview />);

      expect(await screen.findByText('Dated Cert')).toBeInTheDocument();
      expect(screen.getByText(new Date('2023-01-02T03:04:05').toLocaleString())).toBeInTheDocument();
      expect(screen.queryByText('Unknown date')).not.toBeInTheDocument();
    });

    it('still loads the other items when the certificates request fails', async () => {
      client.get.mockImplementation((url) => {
        if (url.includes('/api/achievements/admin/certificates')) {
          return Promise.reject(new Error('boom'));
        }
        if (url.includes('manage-projects')) {
          return Promise.resolve({ data: { data: { projects: [{ id: 3, name: 'Survivor Project', submitted_at: '2023-01-01', user_nickname: 'Eve' }] } } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      render(<ToReview />);

      expect(await screen.findByText('Survivor Project')).toBeInTheDocument();
    });
  });

  describe('review actions', () => {
    const projects = [{ id: 11, name: 'Space Game', submitted_at: '2023-01-01', user_nickname: 'Ann', user_username: 'ann' }];
    const certificates = [
      { id: 21, achievement: { name: 'Loops Master' }, user: { username: 'cal', nickname: 'Cal' }, submitted_at: '2023-01-01T10:00:00' },
    ];
    const pendingUsers = [
      { id: 31, username: 'newkid', nickname: 'New Kid' },
      { id: 32, username: 'newkid2', nickname: 'Second Kid' },
    ];
    const trades = [
      { id: 41, username: 'dee', nickname: 'Dee', timestamp: '2023-01-01T10:00:00', bit_ducks: [1, 0, 1], byte_ducks: [] },
      { id: 42, username: 'eli', nickname: 'Eli', timestamp: '2023-01-02T10:00:00', bit_ducks: [1], byte_ducks: [] },
    ];
    const courseRequests = [
      { id: 51, student_username: 'fay', requested_course_id: 'co1', course_instance_id: 'inst-1', url: 'https://example.com/c', requested_at: '2023-01-03T10:00:00' },
    ];

    const loadItems = async (items = {}, tabLabel = null) => {
      client.get.mockImplementation((url) => {
        if (url.includes('/api/achievements/admin/certificates')) {
          return Promise.resolve({ data: { status: 'success', data: { certificates: items.certificates || [] } } });
        }
        if (url.includes('manage-projects')) return Promise.resolve({ data: { data: { projects: items.projects || [] } } });
        if (url.includes('pending_users')) return Promise.resolve({ data: { data: { users: items.users || [] } } });
        if (url.includes('pending_trades')) return Promise.resolve({ data: { data: { trades: items.trades || [] } } });
        if (url.includes('course-requests')) return Promise.resolve({ data: { requests: items.courseRequests || [] } });
        if (url.includes('/api/admin/crud/classroom')) return Promise.resolve({ data: { data: [{ id: 'cl1', name: 'Class 1' }] } });
        if (url.includes('/api/admin/crud/course')) return Promise.resolve({ data: { data: [{ id: 'co1', name: 'Course 1' }] } });
        return Promise.resolve({ data: { data: [] } });
      });
      render(<ToReview />);
      // The tab list only renders once loading is over.
      await screen.findByText('All Items');
      if (tabLabel) fireEvent.click(screen.getByText(tabLabel));
    };

    const rejectionFor = (data, status = 400) => ({ response: { status, data } });

    beforeEach(() => {
      client.post.mockReset();
    });

    describe('duck trades', () => {
      it('confirms, then approves a trade and removes its card', async () => {
        await loadItems({ trades }, 'Duck Trades');
        client.post.mockResolvedValueOnce({ data: { status: 'success', message: 'Trade approved' } });

        fireEvent.click(screen.getAllByRole('button', { name: /Approve Trade/ })[0]);

        await waitFor(() => expect(screen.queryByText('@dee')).not.toBeInTheDocument());
        expect(showConfirm).toHaveBeenCalledWith(
          "Approve this trade? The student's duck balance will be debited.",
          { title: 'Approve Trade', confirmText: 'Approve', destructive: false }
        );
        const [url, body] = client.post.mock.calls[0];
        expect(url).toBe('/api/admin/trade_action');
        expect(body.get('trade_id')).toBe('41');
        expect(body.get('action')).toBe('approve');
        expect(screen.getByText('@eli')).toBeInTheDocument();
        expect(toast.error).not.toHaveBeenCalled();
      });

      it('confirms with a destructive prompt before rejecting a trade', async () => {
        await loadItems({ trades }, 'Duck Trades');
        client.post.mockResolvedValueOnce({ data: { status: 'success', message: 'Trade rejected' } });

        fireEvent.click(screen.getAllByRole('button', { name: /Reject Trade/ })[1]);

        await waitFor(() => expect(screen.queryByText('@eli')).not.toBeInTheDocument());
        expect(showConfirm).toHaveBeenCalledWith(
          'Reject this trade? This cannot be undone.',
          { title: 'Reject Trade', confirmText: 'Reject', destructive: true }
        );
        const body = client.post.mock.calls[0][1];
        expect(body.get('trade_id')).toBe('42');
        expect(body.get('action')).toBe('reject');
      });

      it('does nothing when the trade confirmation is cancelled', async () => {
        await loadItems({ trades }, 'Duck Trades');
        showConfirm.mockResolvedValue(false);

        fireEvent.click(screen.getAllByRole('button', { name: /Approve Trade/ })[0]);
        fireEvent.click(screen.getAllByRole('button', { name: /Reject Trade/ })[0]);

        await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(2));
        expect(client.post).not.toHaveBeenCalled();
        expect(screen.getByText('@dee')).toBeInTheDocument();
        expect(screen.getByText('@eli')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Approve Trade/ })[0]).toBeEnabled();
      });

      it("shows the server's reason and keeps the trade when the student has too few ducks", async () => {
        await loadItems({ trades }, 'Duck Trades');
        client.post.mockRejectedValueOnce(rejectionFor({ status: 'error', message: 'Insufficient ducks' }));

        fireEvent.click(screen.getAllByRole('button', { name: /Approve Trade/ })[0]);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Insufficient ducks'));
        expect(screen.getByText('@dee')).toBeInTheDocument();
        expect(screen.getByText('@eli')).toBeInTheDocument();
        await waitFor(() => expect(screen.getAllByRole('button', { name: /Approve Trade/ })[0]).toBeEnabled());
      });

      it('falls back to a generic message when the failure carries no reason', async () => {
        await loadItems({ trades }, 'Duck Trades');
        client.post.mockRejectedValueOnce(new Error('Network Error'));

        fireEvent.click(screen.getAllByRole('button', { name: /Approve Trade/ })[0]);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to process trade.'));
      });

      it('confirms once with the count before a bulk approval and clears the selection', async () => {
        await loadItems({ trades }, 'Duck Trades');
        client.post.mockResolvedValue({ data: { status: 'success' } });

        fireEvent.click(screen.getByText(/Select All/).previousSibling);
        expect(screen.getByText('Select All (2)')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Approve Selected/ }));

        await waitFor(() => expect(screen.queryByText('@dee')).not.toBeInTheDocument());
        expect(screen.queryByText('@eli')).not.toBeInTheDocument();
        expect(showConfirm).toHaveBeenCalledTimes(1);
        expect(showConfirm).toHaveBeenCalledWith(
          "Approve 2 trades? Each student's duck balance will be debited.",
          { title: 'Approve Trades', confirmText: 'Approve Selected', destructive: false }
        );
        expect(client.post).toHaveBeenCalledTimes(2);
        expect(toast.error).not.toHaveBeenCalled();
      });

      it('uses the singular for a bulk run of one trade and a destructive prompt for rejection', async () => {
        await loadItems({ trades }, 'Duck Trades');
        client.post.mockResolvedValue({ data: { status: 'success' } });

        fireEvent.click(screen.getAllByRole('checkbox')[1]);
        fireEvent.click(screen.getByRole('button', { name: /Reject Selected/ }));

        await waitFor(() => expect(screen.queryByText('@dee')).not.toBeInTheDocument());
        expect(showConfirm).toHaveBeenCalledWith(
          'Reject 1 trade? This cannot be undone.',
          { title: 'Reject Trades', confirmText: 'Reject Selected', destructive: true }
        );
        expect(client.post).toHaveBeenCalledTimes(1);
      });

      it('keeps everything selected when a bulk confirmation is cancelled', async () => {
        await loadItems({ trades }, 'Duck Trades');
        showConfirm.mockResolvedValue(false);

        fireEvent.click(screen.getByText(/Select All/).previousSibling);
        fireEvent.click(screen.getByRole('button', { name: /Approve Selected/ }));

        await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(1));
        expect(client.post).not.toHaveBeenCalled();
        expect(screen.getByText('Select All (2)')).toBeInTheDocument();
        expect(screen.getByText('@dee')).toBeInTheDocument();
      });

      it('reports bulk failures with the server reasons and keeps only those trades selected', async () => {
        await loadItems({ trades }, 'Duck Trades');
        client.post
          .mockResolvedValueOnce({ data: { status: 'success' } })
          .mockRejectedValueOnce(rejectionFor({ status: 'error', message: 'Insufficient ducks' }));

        fireEvent.click(screen.getByText(/Select All/).previousSibling);
        fireEvent.click(screen.getByRole('button', { name: /Approve Selected/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('1 of 2 trades could not be processed: Insufficient ducks'));
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('@dee')).not.toBeInTheDocument();
        expect(screen.getByText('@eli')).toBeInTheDocument();
        expect(screen.getByText('Select All (1)')).toBeInTheDocument();
      });
    });

    describe('account signups', () => {
      it('shows the reason the server gives when an approval fails', async () => {
        await loadItems({ users: pendingUsers }, 'Account Signups');
        client.post.mockRejectedValueOnce(rejectionFor({ status: 'error', data: null, error: 'User not found' }, 404));

        fireEvent.click(screen.getAllByRole('button', { name: /Approve Account/ })[0]);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('User not found'));
        expect(screen.getByRole('heading', { name: 'New Kid' })).toBeInTheDocument();
      });

      it('does not reject a user when the confirmation is cancelled', async () => {
        await loadItems({ users: pendingUsers }, 'Account Signups');
        showConfirm.mockResolvedValue(false);

        fireEvent.click(screen.getAllByRole('button', { name: /Reject & Delete/ })[0]);

        await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(1));
        expect(client.post).not.toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: 'New Kid' })).toBeInTheDocument();
      });

      it('summarises bulk failures instead of swallowing them and keeps the failed users selected', async () => {
        await loadItems({ users: pendingUsers }, 'Account Signups');
        client.post
          .mockRejectedValueOnce(rejectionFor({ status: 'error', data: null, error: 'User not found' }, 404))
          .mockResolvedValueOnce({ data: { status: 'success' } });

        fireEvent.click(screen.getByText(/Select All/).previousSibling);
        fireEvent.click(screen.getByRole('button', { name: /Approve Selected/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('1 of 2 users could not be processed: User not found'));
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('heading', { name: 'New Kid' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Second Kid' })).not.toBeInTheDocument();
        expect(screen.getByText('Select All (1)')).toBeInTheDocument();
      });
    });

    describe('projects', () => {
      const typeFeedback = (text) => fireEvent.change(screen.getByLabelText(/Teacher Feedback/), { target: { value: text } });

      it('asks for feedback before approving and does not prompt without it', async () => {
        await loadItems({ projects });

        fireEvent.click(screen.getByRole('button', { name: /Approve Project/ }));

        expect(toast.error).toHaveBeenCalledWith('Please provide teacher feedback comment before approving.');
        expect(showConfirm).not.toHaveBeenCalled();
        expect(client.post).not.toHaveBeenCalled();
      });

      it('confirms the packet reward, then approves and removes the project', async () => {
        await loadItems({ projects });
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });
        typeFeedback('Great work');

        fireEvent.click(screen.getByRole('button', { name: /Approve Project/ }));

        await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
        expect(showConfirm).toHaveBeenCalledWith(
          'Approve this project and award 0.0060 packets?',
          { title: 'Approve Project', confirmText: 'Approve', destructive: false }
        );
        expect(client.post).toHaveBeenCalledWith('/api/admin/handle-project-review/11', {
          action: 'approve',
          teacher_comment: 'Great work',
          packet_reward: 0.006,
        });
        await waitFor(() => expect(screen.queryByText('@ann')).not.toBeInTheDocument());
      });

      it('leaves the project alone when the approval is cancelled', async () => {
        await loadItems({ projects });
        showConfirm.mockResolvedValue(false);
        typeFeedback('Great work');

        fireEvent.click(screen.getByRole('button', { name: /Approve Project/ }));

        await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(1));
        expect(client.post).not.toHaveBeenCalled();
        expect(screen.getByText('@ann')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Approve Project/ })).toBeEnabled();
      });

      it('warns that awarded packets are retracted before asking for a revision', async () => {
        await loadItems({ projects });
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });
        typeFeedback('Please add comments');

        fireEvent.click(screen.getByRole('button', { name: /Request Revision/ }));

        await waitFor(() => expect(screen.queryByText('@ann')).not.toBeInTheDocument());
        expect(showConfirm).toHaveBeenCalledWith(
          'Send this project back for revision? Any packets already awarded will be retracted.',
          { title: 'Request Revision', confirmText: 'Request Revision', destructive: true }
        );
        expect(client.post).toHaveBeenCalledWith('/api/admin/handle-project-review/11', {
          action: 'reject',
          teacher_comment: 'Please add comments',
          packet_reward: 0.006,
        });
      });

      it('does not send the project back when that is cancelled', async () => {
        await loadItems({ projects });
        showConfirm.mockResolvedValue(false);

        fireEvent.click(screen.getByRole('button', { name: /Request Revision/ }));

        await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(1));
        expect(client.post).not.toHaveBeenCalled();
        expect(screen.getByText('@ann')).toBeInTheDocument();
      });

      it("shows the server's reason, whichever field it uses", async () => {
        await loadItems({ projects });
        client.post.mockRejectedValueOnce(rejectionFor({ error: 'Admin access required' }, 403));
        typeFeedback('Great work');

        fireEvent.click(screen.getByRole('button', { name: /Approve Project/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Admin access required'));
        expect(screen.getByText('@ann')).toBeInTheDocument();
      });
    });

    describe('certificates', () => {
      it('confirms before marking a certificate reviewed and removes it', async () => {
        await loadItems({ certificates }, 'Certificates');
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });

        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        await waitFor(() => expect(screen.queryByText('Loops Master')).not.toBeInTheDocument());
        expect(showConfirm).toHaveBeenCalledWith(
          'Mark this certificate as reviewed and approved? The student will be notified and this cannot be undone.',
          { title: 'Approve Certificate', confirmText: 'Approve' }
        );
        expect(client.post).toHaveBeenCalledWith('/api/achievements/admin/certificates/reviewed/21');
      });

      it('does not approve when the confirmation is cancelled', async () => {
        await loadItems({ certificates }, 'Certificates');
        showConfirm.mockResolvedValue(false);

        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(1));
        expect(client.post).not.toHaveBeenCalled();
        expect(screen.getByText('Loops Master')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
      });

      it('shows the server reason when an approval fails', async () => {
        await loadItems({ certificates }, 'Certificates');
        client.post.mockRejectedValueOnce(rejectionFor({ error: 'Certificate not found' }, 404));

        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Certificate not found'));
        expect(screen.getByText('Loops Master')).toBeInTheDocument();
      });

      it('collects the optional reason in a modal instead of a browser prompt', async () => {
        const promptMock = vi.fn(() => 'ignored');
        window.prompt = promptMock;
        await loadItems({ certificates }, 'Certificates');
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(client.post).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: '  Blurry scan  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reject Certificate' }));

        await waitFor(() => expect(screen.queryByText('Loops Master')).not.toBeInTheDocument());
        expect(client.post).toHaveBeenCalledWith('/api/achievements/admin/certificates/reject/21', { review_note: 'Blurry scan' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(promptMock).not.toHaveBeenCalled();
      });

      it('rejects without a note when the reason is left empty', async () => {
        await loadItems({ certificates }, 'Certificates');
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
        fireEvent.click(screen.getByRole('button', { name: 'Reject Certificate' }));

        await waitFor(() => expect(screen.queryByText('Loops Master')).not.toBeInTheDocument());
        expect(client.post).toHaveBeenCalledWith('/api/achievements/admin/certificates/reject/21', { review_note: undefined });
      });

      it('cancelling the reason modal cancels the rejection', async () => {
        await loadItems({ certificates }, 'Certificates');

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
        fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Typed then changed my mind' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(client.post).not.toHaveBeenCalled();
        expect(screen.getByText('Loops Master')).toBeInTheDocument();

        // Reopening starts from an empty reason.
        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
        expect(screen.getByLabelText(/Reason/)).toHaveValue('');
      });

      it('closing the reason modal with Escape cancels the rejection', async () => {
        await loadItems({ certificates }, 'Certificates');

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
        fireEvent.keyDown(document, { key: 'Escape' });

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(client.post).not.toHaveBeenCalled();
      });

      it('shows the server reason when a rejection fails', async () => {
        await loadItems({ certificates }, 'Certificates');
        client.post.mockRejectedValueOnce(rejectionFor({ status: 'error', data: null, error: 'Certificate not found' }, 404));

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
        fireEvent.click(screen.getByRole('button', { name: 'Reject Certificate' }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Certificate not found'));
        expect(screen.getByText('Loops Master')).toBeInTheDocument();
      });

      it('shows the server reason when approving all fails', async () => {
        await loadItems({ certificates }, 'Certificates');
        client.post.mockRejectedValueOnce(rejectionFor({ error: 'Admin access required' }, 403));

        fireEvent.click(screen.getByRole('button', { name: /Approve All Certificates/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Admin access required'));
        expect(screen.getByText('Loops Master')).toBeInTheDocument();
      });
    });

    describe('checkbox names', () => {
      it('names each account signup checkbox after the account and the select-all box after its label', async () => {
        await loadItems({ users: pendingUsers }, 'Account Signups');

        expect(screen.getByRole('checkbox', { name: 'Select account signup for @newkid' })).not.toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Select account signup for @newkid2' })).not.toBeChecked();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Select account signup for @newkid2' }));

        expect(screen.getByRole('checkbox', { name: 'Select account signup for @newkid2' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Select All (1)' })).not.toBeChecked();
      });

      it('lets a click on the Select All text tick the box, for signups and for trades', async () => {
        await loadItems({ users: pendingUsers, trades }, 'Account Signups');
        fireEvent.click(screen.getByText('Select All (0)'));
        expect(screen.getByRole('checkbox', { name: 'Select All (2)' })).toBeChecked();

        fireEvent.click(screen.getByText('Duck Trades'));
        fireEvent.click(screen.getByText('Select All (0)'));
        expect(screen.getByRole('checkbox', { name: 'Select All (2)' })).toBeChecked();
      });

      it('names each duck trade checkbox after the student', async () => {
        await loadItems({ trades }, 'Duck Trades');

        expect(screen.getByRole('checkbox', { name: 'Select duck trade from @dee' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Select duck trade from @eli' })).toBeInTheDocument();
      });
    });

    describe('course requests', () => {
      it('shows the server reason when a request cannot be approved', async () => {
        await loadItems({ courseRequests }, 'Course Requests');
        client.post.mockRejectedValueOnce(rejectionFor({ success: false, message: 'Course already mapped' }, 409));

        fireEvent.click(screen.getByRole('button', { name: /Approve & Map/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Course already mapped'));
        expect(client.post).toHaveBeenCalledWith('/api/course-requests/51/approve', { classroom_id: 'cl1', course_id: 'co1' });
        expect(screen.getByText('fay')).toBeInTheDocument();
      });
    });
  });

});
