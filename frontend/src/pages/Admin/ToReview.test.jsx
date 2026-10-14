import adminCache from '../../utils/adminCache';
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// The 3D viewer (which loads three.js), the file browser and the asset gallery belong to other modules. Doubles that
// echo their props keep these tests on what ToReview hands them, whatever the real components render.
vi.mock('../../components/common/ModelViewer', () => ({
  default: ({ src, filename, downloadUrl, ariaLabel, className }) => (
    <div
      data-testid="model-viewer"
      role="img"
      aria-label={ariaLabel}
      className={className}
      data-src={src}
      data-filename={filename}
      data-download-url={downloadUrl}
    />
  ),
}));

vi.mock('../../components/common/ProjectFileBrowser', () => ({
  default: ({ files, maxHeight }) => (
    <div data-testid="project-file-browser" data-max-height={maxHeight}>{files.map((f) => f.path).join(' | ')}</div>
  ),
}));

vi.mock('../../components/common/AssetGallery', () => ({
  default: ({ files }) => <div data-testid="asset-gallery">{files.map((f) => f.path).join(' | ')}</div>,
}));

// The real grouping, but readable URLs: the real projectFileUrl goes through the apiUrl mock above, which turns every
// path into about:blank and would make the model URL indistinguishable from its download URL.
vi.mock('../../utils/projectFiles', async (importOriginal) => ({
  ...(await importOriginal()),
  projectFileUrl: (file, { download = false } = {}) => `https://api.test${download ? file.download_url : file.url}`,
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

// The certificate previews frame an object URL, and happy-dom cannot load blob: URLs (it logs an error
// per iframe). An about: URL stands in for it: happy-dom opens those without a request.
const realCreateObjectURL = URL.createObjectURL;
const realRevokeObjectURL = URL.revokeObjectURL;
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'about:blank');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  URL.createObjectURL = realCreateObjectURL;
  URL.revokeObjectURL = realRevokeObjectURL;
});

describe('ToReview Component', () => {
  beforeEach(() => {
    adminCache.clear();
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

    const tab = (label) =>
      screen.getAllByRole('button').find((b) => b.classList.contains('review-tab-item') && b.textContent.includes(label));

    // 'All Items' lists a card of every kind
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Cert 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve Account/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve Trade/ })).toBeInTheDocument();

    // Each tab narrows the list to its own kind
    fireEvent.click(tab('Certificates'));
    expect(screen.getByText('Cert 1')).toBeInTheDocument();
    expect(screen.queryByText('Project 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve Trade/ })).not.toBeInTheDocument();

    fireEvent.click(tab('Projects'));
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Cert 1')).not.toBeInTheDocument();

    fireEvent.click(tab('Account Signups'));
    expect(screen.getByRole('button', { name: /Approve Account/ })).toBeInTheDocument();
    expect(screen.queryByText('Project 1')).not.toBeInTheDocument();

    fireEvent.click(tab('Duck Trades'));
    expect(screen.getByRole('button', { name: /Approve Trade/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve Account/ })).not.toBeInTheDocument();

    // A tab without items says so
    fireEvent.click(tab('Course Requests'));
    expect(screen.queryByRole('button', { name: /Approve Trade/ })).not.toBeInTheDocument();
    expect(screen.getByText('All Caught Up!')).toBeInTheDocument();

    fireEvent.click(tab('All Items'));
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Cert 1')).toBeInTheDocument();
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

  describe('certificate preview', () => {
    const cert = { id: 7, achievement: { name: 'Python Basics' }, user: { username: 'bob' }, submitted_at: '2023-01-01T10:00:00' };
    const objectUrl = 'about:blank?cert=7';

    const mockApi = (certificatePdf) => {
      client.get.mockImplementation((url) => {
        if (url.includes('/api/achievements/admin/certificates')) {
          return Promise.resolve({ data: { status: 'success', data: { certificates: [cert] } } });
        }
        if (url.includes('/api/achievements/view_certificate/')) return certificatePdf();
        return Promise.resolve({ data: { data: [] } });
      });
    };

    beforeEach(() => {
      URL.createObjectURL.mockReturnValue(objectUrl);
    });

    it('frames an object URL of the PDF fetched through the API client, not the API URL itself', async () => {
      const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
      mockApi(() => Promise.resolve({ data: pdf }));

      render(<ToReview />);

      const frame = await screen.findByTitle('Certificate Preview');
      expect(frame).toHaveAttribute('src', `${objectUrl}#toolbar=0&navpanes=0&scrollbar=0`);
      expect(client.get).toHaveBeenCalledWith(
        '/api/achievements/view_certificate/7',
        expect.objectContaining({ responseType: 'blob' })
      );
      expect(URL.createObjectURL.mock.calls[0][0].type).toBe('application/pdf');
    });

    it('shows a loading placeholder until the PDF arrives', async () => {
      mockApi(() => new Promise(() => {}));

      render(<ToReview />);

      expect(await screen.findByRole('status', { name: 'Loading certificate preview' })).toBeInTheDocument();
      expect(screen.queryByTitle('Certificate Preview')).not.toBeInTheDocument();
    });

    it('says the preview is unavailable when the PDF cannot be fetched, leaving the card usable', async () => {
      mockApi(() => Promise.reject({ response: { status: 404 } }));

      render(<ToReview />);

      expect(await screen.findByText('Preview unavailable')).toBeInTheDocument();
      expect(screen.queryByTitle('Certificate Preview')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
    });

    it('releases the object URL when the card leaves the list', async () => {
      mockApi(() => Promise.resolve({ data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }) }));
      render(<ToReview />);
      await screen.findByTitle('Certificate Preview');

      const projectsTab = screen.getAllByRole('button').find((b) => b.classList.contains('review-tab-item') && b.textContent.includes('Projects'));
      fireEvent.click(projectsTab);

      await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl));
      expect(screen.queryByTitle('Certificate Preview')).not.toBeInTheDocument();
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
      { id: 51, student_username: 'fay', requested_course_id: 'co1', course_instance_id: 'inst-1', url: 'https://example.com/c', created_at: '2023-01-03T10:00:00' },
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

      it('confirms, then marks every certificate reviewed in one request and empties the list', async () => {
        await loadItems({ certificates: [...certificates, { id: 22, achievement: { name: 'Loops Expert' }, user: { username: 'dan' }, submitted_at: '2023-01-02T10:00:00' }] }, 'Certificates');
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });

        fireEvent.click(screen.getByRole('button', { name: /Approve All Certificates/ }));

        await waitFor(() => expect(screen.queryByText('Loops Master')).not.toBeInTheDocument());
        expect(screen.queryByText('Loops Expert')).not.toBeInTheDocument();
        expect(showConfirm).toHaveBeenCalledWith(
          'Are you sure you want to mark all pending certificates as reviewed?',
          { title: 'Review All Certificates', confirmText: 'Review All' }
        );
        expect(client.post).toHaveBeenCalledTimes(1);
        expect(client.post).toHaveBeenCalledWith('/api/achievements/admin/certificates/reviewed/all');
        expect(toast.error).not.toHaveBeenCalled();
      });

      it('does not approve everything when the confirmation is cancelled', async () => {
        await loadItems({ certificates }, 'Certificates');
        showConfirm.mockResolvedValue(false);

        fireEvent.click(screen.getByRole('button', { name: /Approve All Certificates/ }));

        await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(1));
        expect(client.post).not.toHaveBeenCalled();
        expect(screen.getByText('Loops Master')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Approve All Certificates/ })).toBeEnabled();
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
      it('shows when the request was made, from the created_at the API sends', async () => {
        await loadItems({ courseRequests }, 'Course Requests');

        expect(screen.getByText(new Date('2023-01-03T10:00:00').toLocaleString())).toBeInTheDocument();
        expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
      });

      it('shows a placeholder instead of Invalid Date when a request has no date', async () => {
        await loadItems({ courseRequests: [{ ...courseRequests[0], created_at: null }] }, 'Course Requests');

        expect(screen.getByText('Unknown date')).toBeInTheDocument();
        expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
      });

      it('sorts a request among the other items by when it was made', async () => {
        await loadItems({
          projects,
          courseRequests: [{ ...courseRequests[0], created_at: '2022-12-31T10:00:00' }],
        });

        const cards = [...document.querySelectorAll('.review-card')];
        expect(cards.map((c) => c.className.includes('course-review-card'))).toEqual([false, true]);
      });

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

  describe('project approval toast', () => {
    beforeEach(() => {
      // Drop any unconsumed mockResolvedValueOnce values queued by earlier tests.
      client.post.mockReset();
    });

    const mockOneProject = () => {
      client.get.mockImplementation((url) => {
        if (url.includes('projects')) {
          return Promise.resolve({
            data: { data: { projects: [{ id: 5, name: 'Name Tag Model', submitted_at: '2023-01-01', user_nickname: 'Bob' }] } },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });
    };

    const approveProject = async () => {
      render(<ToReview />);
      await screen.findByText('Name Tag Model');
      fireEvent.change(screen.getByLabelText(/Teacher Feedback/i), { target: { value: 'Nice work' } });
      fireEvent.click(screen.getByRole('button', { name: /Approve Project/i }));
    };

    it('shows a challenge-completed toast when the approval completed a 3D challenge', async () => {
      mockOneProject();
      client.post.mockResolvedValueOnce({
        data: { status: 'success', message: 'ok', challenge_completed: true, challenge_slug: 'name-tag-model' },
      });

      await approveProject();

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Project approved — 3D challenge completed!'));
      await waitFor(() => expect(screen.queryByText('Name Tag Model')).not.toBeInTheDocument());
    });

    it('shows no toast for an ordinary approval (no linked challenge or already completed)', async () => {
      mockOneProject();
      client.post.mockResolvedValueOnce({
        data: { status: 'success', message: 'ok', challenge_completed: false, challenge_slug: null },
      });

      await approveProject();

      await waitFor(() => expect(screen.queryByText('Name Tag Model')).not.toBeInTheDocument());
      expect(client.post).toHaveBeenCalledWith(
        '/api/admin/handle-project-review/5',
        expect.objectContaining({ action: 'approve' })
      );
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  it('initializes from admin_to_review cache immediately and fetches in background', async () => {
    const cachedData = {
      projects: [{ id: 99, name: 'Cached Review Project', submitted_at: '2023-01-01', user_nickname: 'CachedUser' }],
      certificates: [],
      pendingUsers: [],
      trades: [],
      courseRequests: [],
      classrooms: [],
      courses: []
    };
    adminCache.set('admin_to_review', cachedData);

    client.get.mockImplementation((url) => {
      if (url.includes('projects')) {
        return Promise.resolve({ data: { data: { projects: [{ id: 100, name: 'Fresh Project', submitted_at: '2023-01-01', user_nickname: 'FreshUser' }] } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<ToReview />);

    // Immediately shows cached data without loading state
    expect(screen.getByText('Cached Review Project')).toBeInTheDocument();

    // Background fetch resolves and updates view
    await waitFor(() => {
      expect(screen.getByText('Fresh Project')).toBeInTheDocument();
    });
    expect(adminCache.get('admin_to_review')).toBeDefined();
  });

  it('renders parent messages tab and resolves a message', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('/api/admin/crud/classroom') || url.includes('/api/admin/crud/course')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('parent-messages')) {
        return Promise.resolve({
          data: {
            messages: [
              {
                id: 101,
                parent_id: 10,
                parent_name: 'Jane Doe',
                parent_username: 'janedoe',
                parent_email: 'jane@example.com',
                student_names: ['Tommy'],
                subject: 'Attendance inquiry',
                body: 'Will Tommy miss points for absence?',
                status: 'pending',
                created_at: '2026-09-13T10:00:00Z',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    client.post.mockResolvedValue({
      data: { status: 'success', message: 'Parent message marked as resolved.' },
    });

    render(<ToReview />);

    await waitFor(() => {
      expect(screen.getByText('Parent Messages')).toBeInTheDocument();
    });

    // Switch to Parent Messages tab
    fireEvent.click(screen.getByText('Parent Messages'));

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Attendance inquiry')).toBeInTheDocument();
      expect(screen.getByText('Will Tommy miss points for absence?')).toBeInTheDocument();
      expect(screen.getByText('Tommy')).toBeInTheDocument();
    });

    // Click Mark as Resolved
    const resolveBtn = screen.getByRole('button', { name: /Mark as Resolved/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/admin/parent-messages/101/resolve');
    });

    // Card is removed from view
    await waitFor(() => {
      expect(screen.queryByText('Attendance inquiry')).not.toBeInTheDocument();
    });
  });

  describe('parent message resolve errors', () => {
    beforeEach(() => {
      // Drop any queued once-implementations leaked from earlier tests
      client.get.mockReset();
      client.post.mockReset();
    });

    const mockPendingMessage = () => {
      client.get.mockImplementation((url) => {
        if (url.includes('/api/admin/crud/classroom') || url.includes('/api/admin/crud/course')) {
          return Promise.resolve({ data: { data: [] } });
        }
        if (url.includes('parent-messages')) {
          return Promise.resolve({
            data: {
              messages: [{
                id: 202, parent_id: 11, parent_name: 'Sam Parent', parent_username: 'samp',
                student_names: ['Kid'], subject: 'Stale message', body: 'Hello', status: 'pending',
                created_at: '2026-09-13T10:00:00Z',
              }],
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });
    };

    const openMessagesAndResolve = async () => {
      render(<ToReview />);
      await waitFor(() => expect(screen.getByText('Parent Messages')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Parent Messages'));
      await waitFor(() => expect(screen.getByText('Stale message')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Mark as Resolved/i }));
    };

    it('removes the card, invalidates the cache and shows the API error on 404', async () => {
      mockPendingMessage();
      const invalidateSpy = vi.spyOn(adminCache, 'invalidate');
      client.post.mockRejectedValue({
        response: { status: 404, data: { status: 'error', data: null, error: 'Message not found' } },
      });

      await openMessagesAndResolve();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Message not found'));
      await waitFor(() => expect(screen.queryByText('Stale message')).not.toBeInTheDocument());
      expect(invalidateSpy).toHaveBeenCalledWith('admin_to_review');
    });

    it('keeps the card and falls back to message/default text on other errors', async () => {
      mockPendingMessage();
      client.post.mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Legacy failure' } },
      });

      await openMessagesAndResolve();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Legacy failure'));
      expect(screen.getByText('Stale message')).toBeInTheDocument();

      client.post.mockRejectedValueOnce({ response: { status: 500, data: {} } });
      fireEvent.click(screen.getByRole('button', { name: /Mark as Resolved/i }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to resolve parent message.'));
      expect(screen.getByText('Stale message')).toBeInTheDocument();
    });
  });

  describe('project type and files', () => {
    const makeFile = (id, kind, path) => {
      const name = path.split('/').pop();
      return {
        id,
        kind,
        name,
        path,
        size: 100,
        content_type: 'text/plain; charset=utf-8',
        url: `/user/project_files/${id}/${name}`,
        download_url: `/user/project_files/${id}/${name}?download=1`,
        created_at: '2026-10-14T05:00:00Z',
      };
    };
    const robot = makeFile(1, 'model', 'robot.stl');
    const mainPy = makeFile(2, 'source', 'src/main.py');
    const utilsPy = makeFile(3, 'source', 'src/utils.py');
    const logo = makeFile(4, 'asset', 'logo.png');

    // Carries a video so that "Missing Video" does not muddy the assertions that are about code and models.
    const makeProject = (overrides = {}) => ({
      id: 70,
      name: 'Robot Arm',
      submitted_at: '2023-01-01',
      user_nickname: 'Ann',
      user_username: 'ann',
      project_type: 'code',
      code_snippet: null,
      github_link: null,
      video_url: 'https://video.test/demo',
      files: [],
      ...overrides,
    });

    const loadProjects = async (...projects) => {
      client.get.mockImplementation((url) => {
        if (url.includes('manage-projects')) return Promise.resolve({ data: { data: { projects } } });
        return Promise.resolve({ data: { data: [] } });
      });
      render(<ToReview />);
      await screen.findByText(projects[0].name);
    };

    const shown = (text) => screen.queryByText(text) !== null;

    describe('type badge', () => {
      it('marks a 3D project right after the Project badge', async () => {
        await loadProjects(makeProject({ project_type: '3d', files: [robot] }));

        const badge = screen.getByText('3D');

        expect(badge).toHaveClass('badge-project-type');
        expect(badge.previousElementSibling).toHaveClass('badge-project');
      });

      it.each([
        ['a code project', { project_type: 'code' }],
        ['a payload from before project types existed', { project_type: undefined }],
      ])('adds no badge to %s', async (_label, overrides) => {
        await loadProjects(makeProject(overrides));

        expect(screen.queryByText('3D')).not.toBeInTheDocument();
      });
    });

    describe('missing indicators', () => {
      it.each([
        ['a code project with nothing attached', {}, true, false],
        ['a payload without a project type', { project_type: undefined }, true, false],
        ['a code project with only an asset', { files: [logo] }, true, false],
        ['a code project with a pasted snippet', { code_snippet: 'print(1)' }, false, false],
        ['a code project with a GitHub link', { github_link: 'https://github.com/a/b' }, false, false],
        ['a code project with source files', { files: [mainPy] }, false, false],
        ['a 3D project without a model', { project_type: '3d' }, false, true],
        ['a 3D project with a snippet but no model', { project_type: '3d', code_snippet: 'x = 1' }, false, true],
        ['a 3D project with source files but no model', { project_type: '3d', files: [mainPy] }, false, true],
        ['a 3D project with a model', { project_type: '3d', files: [robot] }, false, false],
        ['a 3D project whose files were never sent', { project_type: '3d', files: undefined }, false, true],
      ])('%s', async (_label, overrides, flagsCode, flagsModel) => {
        await loadProjects(makeProject(overrides));

        expect(shown('Missing Code')).toBe(flagsCode);
        expect(shown('Missing 3D model')).toBe(flagsModel);
      });

      it('still flags a missing video, on either type', async () => {
        await loadProjects(
          makeProject({ video_url: null }),
          makeProject({ id: 71, name: 'Vase', project_type: '3d', files: [robot], video_url: null })
        );

        expect(screen.getAllByText('Missing Video')).toHaveLength(2);
      });

      it('does not flag the video when there is one', async () => {
        await loadProjects(makeProject());

        expect(shown('Missing Video')).toBe(false);
      });
    });

    describe('3D model section', () => {
      const modelProject = () => makeProject({ project_type: '3d', files: [robot] });

      it('is closed by default, so no viewer (and no three.js) is mounted', async () => {
        await loadProjects(modelProject());

        expect(screen.getByRole('button', { name: '3D model' })).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByTestId('model-viewer')).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Download/ })).not.toBeInTheDocument();
      });

      it('opens on click with the model URLs for the viewer, and closes again', async () => {
        await loadProjects(modelProject());
        const toggle = screen.getByRole('button', { name: '3D model' });

        fireEvent.click(toggle);

        const viewer = screen.getByTestId('model-viewer');
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(viewer).toHaveAttribute('data-src', 'https://api.test/user/project_files/1/robot.stl');
        expect(viewer).toHaveAttribute('data-download-url', 'https://api.test/user/project_files/1/robot.stl?download=1');
        expect(viewer).toHaveAttribute('data-filename', 'robot.stl');
        expect(viewer).toHaveAccessibleName('3D model of Robot Arm');
        expect(screen.getByRole('link', { name: 'Download robot.stl' }))
          .toHaveAttribute('href', 'https://api.test/user/project_files/1/robot.stl?download=1');

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByTestId('model-viewer')).not.toBeInTheDocument();
      });

      it('shows the first model in the viewer and offers every model for download', async () => {
        // Sorts after robot.stl by path as well as by position, so the test holds whichever order the helpers keep.
        const second = makeFile(5, 'model', 'stand.glb');
        await loadProjects(makeProject({ project_type: '3d', files: [robot, second] }));

        fireEvent.click(screen.getByRole('button', { name: '3D model' }));

        expect(screen.getAllByTestId('model-viewer')).toHaveLength(1);
        expect(screen.getByTestId('model-viewer')).toHaveAttribute('data-filename', 'robot.stl');
        expect(screen.getByRole('link', { name: 'Download robot.stl' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Download stand.glb' }))
          .toHaveAttribute('href', 'https://api.test/user/project_files/5/stand.glb?download=1');
      });

      it('is offered for any project that carries a model file, whatever its type', async () => {
        await loadProjects(makeProject({ files: [robot] }));

        expect(screen.getByRole('button', { name: '3D model' })).toBeInTheDocument();
        expect(shown('Missing 3D model')).toBe(false);
      });

      it('is absent when the project has no model file', async () => {
        await loadProjects(
          makeProject({ project_type: '3d', files: [mainPy, logo] }),
          makeProject({ id: 71, name: 'Vase', files: [mainPy] })
        );

        expect(screen.queryByRole('button', { name: '3D model' })).not.toBeInTheDocument();
      });
    });

    describe('Files section', () => {
      const sourceProject = () => makeProject({ files: [robot, mainPy, utilsPy, logo] });

      it('counts only the source files and is closed by default', async () => {
        await loadProjects(sourceProject());

        expect(screen.getByRole('button', { name: 'Files (2)' })).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByTestId('project-file-browser')).not.toBeInTheDocument();
      });

      it('opens the file browser on click, with the project files, and closes it again', async () => {
        await loadProjects(sourceProject());
        const toggle = screen.getByRole('button', { name: 'Files (2)' });

        fireEvent.click(toggle);

        const browser = screen.getByTestId('project-file-browser');
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(browser).toHaveTextContent('robot.stl | src/main.py | src/utils.py | logo.png');
        expect(browser).toHaveAttribute('data-max-height', '420px');

        fireEvent.click(toggle);

        expect(screen.queryByTestId('project-file-browser')).not.toBeInTheDocument();
      });

      it('is absent when the project has no source file', async () => {
        await loadProjects(makeProject({ files: [robot, logo] }));

        expect(screen.queryByRole('button', { name: /^Files/ })).not.toBeInTheDocument();
      });
    });

    describe('Assets section', () => {
      const assetProject = () => makeProject({ files: [robot, mainPy, logo, makeFile(6, 'asset', 'hit.wav')] });

      it('counts only the assets and is closed by default', async () => {
        await loadProjects(assetProject());

        expect(screen.getByRole('button', { name: 'Assets (2)' })).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByTestId('asset-gallery')).not.toBeInTheDocument();
      });

      it('opens the gallery on click, with the project files, and closes it again', async () => {
        await loadProjects(assetProject());
        const toggle = screen.getByRole('button', { name: 'Assets (2)' });

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByTestId('asset-gallery')).toHaveTextContent('robot.stl | src/main.py | logo.png | hit.wav');

        fireEvent.click(toggle);

        expect(screen.queryByTestId('asset-gallery')).not.toBeInTheDocument();
      });

      it('is absent when the project has no asset', async () => {
        await loadProjects(makeProject({ files: [robot, mainPy] }));

        expect(screen.queryByRole('button', { name: /^Assets/ })).not.toBeInTheDocument();
      });
    });

    describe('sections together', () => {
      it('adds no toggle to a project without files', async () => {
        await loadProjects(makeProject({ files: undefined }));

        expect(screen.queryByRole('button', { name: /^(3D model|Files|Assets)/ })).not.toBeInTheDocument();
      });

      it('opens each section independently, and the code snippet with them', async () => {
        await loadProjects(makeProject({ project_type: '3d', code_snippet: 'x = 1', files: [robot, mainPy, logo] }));

        fireEvent.click(screen.getByRole('button', { name: 'Files (1)' }));
        fireEvent.click(screen.getByRole('button', { name: 'Code Snippet' }));

        expect(screen.getByTestId('project-file-browser')).toBeInTheDocument();
        expect(screen.getByText('x = 1')).toBeInTheDocument();
        expect(screen.queryByTestId('model-viewer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('asset-gallery')).not.toBeInTheDocument();
      });

      it('leaves the video transcript toggle working beside the new sections', async () => {
        await loadProjects(makeProject({ video_transcript: 'Welcome to my robot', files: [mainPy] }));
        const toggle = screen.getByRole('button', { name: 'Video Transcript' });

        fireEvent.click(toggle);
        expect(screen.getByText('Welcome to my robot')).toBeInTheDocument();

        fireEvent.click(toggle);
        expect(screen.queryByText('Welcome to my robot')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Files (1)' })).toHaveAttribute('aria-expanded', 'false');
      });

      it('keeps the open state per project', async () => {
        await loadProjects(
          makeProject({ id: 70, name: 'Robot Arm', files: [mainPy] }),
          makeProject({ id: 71, name: 'Vase', files: [mainPy] })
        );
        const card = (name) => within(screen.getByText(name).closest('.review-card'));

        fireEvent.click(card('Vase').getByRole('button', { name: 'Files (1)' }));

        expect(card('Vase').getByTestId('project-file-browser')).toBeInTheDocument();
        expect(card('Robot Arm').queryByTestId('project-file-browser')).not.toBeInTheDocument();
        expect(card('Robot Arm').getByRole('button', { name: 'Files (1)' })).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });
});
