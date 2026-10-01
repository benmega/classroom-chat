import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminAchievements from './AdminAchievements';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const existing = {
  id: 5,
  name: 'Old Timer',
  slug: 'old-timer',
  description: 'Been here a while',
  type: 'ducks',
  reward: 20,
  requirement_value: '100',
  source: '',
};

const legacy = { ...existing, id: 6, name: 'Legacy', slug: 'Legacy_Slug' };

const mockList = (achievements = [existing]) => {
  client.get.mockResolvedValue({ data: { status: 'success', data: { achievements } } });
};

const openAddForm = async () => {
  render(<AdminAchievements />);
  fireEvent.click(await screen.findByRole('button', { name: /Add Achievement/i }));
  return screen.findByLabelText(/Achievement Name/i);
};

const fillAddForm = ({ name = 'Master Coder', slug = 'master-coder', reward } = {}) => {
  fireEvent.change(screen.getByLabelText(/Achievement Name/i), { target: { name: 'name', value: name } });
  fireEvent.change(screen.getByLabelText(/Slug/i), { target: { name: 'slug', value: slug } });
  if (reward !== undefined) {
    fireEvent.change(screen.getByLabelText(/Duck Reward/i), { target: { name: 'reward', value: reward } });
  }
};

const submitForm = () => {
  fireEvent.submit(screen.getByRole('button', { name: /Create Achievement|Save Changes/i }).closest('form'));
};

const chooseBadge = (filename) => {
  const file = new File(['x'], filename, { type: 'image/gif' });
  fireEvent.change(screen.getByLabelText(/Badge Icon/i), { target: { files: [file] } });
};

describe('AdminAchievements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList();
  });

  describe('list view', () => {
    it('loads and renders achievements', async () => {
      render(<AdminAchievements />);
      expect(await screen.findByText('Old Timer')).toBeInTheDocument();
      expect(screen.getByText(/20 ducks/)).toBeInTheDocument();
      expect(client.get).toHaveBeenCalledWith('/api/achievements/all');
    });

    it('shows an empty state', async () => {
      mockList([]);
      render(<AdminAchievements />);
      expect(await screen.findByText('No achievements found.')).toBeInTheDocument();
    });

    it('toasts when loading fails', async () => {
      client.get.mockRejectedValue(new Error('down'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<AdminAchievements />);
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load achievements.'));
      consoleError.mockRestore();
    });
  });

  describe('creating', () => {
    it('posts multipart data with the reward as a whole number and returns to the list', async () => {
      client.post.mockResolvedValue({ data: { status: 'success', message: 'Achievement created!' } });
      await openAddForm();
      fillAddForm({ reward: '15' });

      submitForm();

      await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
      const [url, body] = client.post.mock.calls[0];
      expect(url).toBe('/api/achievements/add');
      expect(body).toBeInstanceOf(FormData);
      expect(body.get('slug')).toBe('master-coder');
      expect(body.get('reward')).toBe('15');
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Achievement created!'));
      expect(await screen.findByRole('button', { name: /Add Achievement/i })).toBeInTheDocument();
    });

    it('shows the server message when a 200 response carries status error', async () => {
      client.post.mockResolvedValue({ data: { status: 'error', message: 'Invalid badge file type.' } });
      await openAddForm();
      fillAddForm();

      submitForm();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid badge file type.'));
      expect(toast.success).not.toHaveBeenCalled();
      // Still on the form so the admin can fix it.
      expect(screen.getByLabelText(/Achievement Name/i)).toBeInTheDocument();
    });

    it('falls back to a generic message when a non-success response has none', async () => {
      client.post.mockResolvedValue({ data: { status: 'error' } });
      await openAddForm();
      fillAddForm();

      submitForm();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save achievement.'));
    });

    it.each(['badge.gif', 'badge.svg'])('toasts the 400 message for a rejected %s upload', async (filename) => {
      client.post.mockRejectedValue({ response: { data: { status: 'error', message: 'Invalid badge file type.' } } });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      await openAddForm();
      fillAddForm();
      chooseBadge(filename);
      expect(screen.getByText(filename)).toBeInTheDocument();

      submitForm();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid badge file type.'));
      expect(client.post.mock.calls[0][1].get('badge').name).toBe(filename);
      consoleError.mockRestore();
    });

    it('falls back to a generic message when the request fails without a body', async () => {
      client.post.mockRejectedValue(new Error('network'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      await openAddForm();
      fillAddForm();

      submitForm();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save achievement.'));
      consoleError.mockRestore();
    });

    it.each(['1.5', '0', '-2', '', 'abc'])('does not submit an invalid reward (%s)', async (reward) => {
      await openAddForm();
      fillAddForm({ reward });

      submitForm();

      expect(toast.error).toHaveBeenCalledWith('Reward must be a whole number of at least 1.');
      expect(client.post).not.toHaveBeenCalled();
    });

    it('restricts the slug input to lowercase letters, digits and hyphens', async () => {
      await openAddForm();
      const slug = screen.getByLabelText(/Slug/i);

      expect(slug).toHaveAttribute('pattern', '[a-z0-9\\-]+');
      expect(slug).toBeRequired();
      // The pattern must compile the way browsers build it (unicode-sets mode) and match the backend.
      const re = new RegExp(`^(?:${slug.getAttribute('pattern')})$`, 'v');
      expect(re.test('master-coder-2')).toBe(true);
      expect(re.test('Bad Slug')).toBe(false);
      expect(re.test('../x')).toBe(false);
    });

    it('makes the reward input a whole-number field', async () => {
      await openAddForm();
      const reward = screen.getByLabelText(/Duck Reward/i);
      expect(reward).toHaveAttribute('min', '1');
      expect(reward).toHaveAttribute('step', '1');
    });

    it('ignores an empty file selection and returns to the list with Back', async () => {
      await openAddForm();
      fireEvent.change(screen.getByLabelText(/Badge Icon/i), { target: { files: [] } });
      expect(screen.getByText('Choose Image...')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Back to List/i }));
      expect(await screen.findByText('Old Timer')).toBeInTheDocument();
    });
  });

  describe('editing', () => {
    const openEditForm = async (achievement = existing) => {
      mockList([achievement]);
      render(<AdminAchievements />);
      fireEvent.click(await screen.findByText(achievement.name));
      return screen.findByLabelText(/Achievement Name/i);
    };

    it('puts the achievement to the edit endpoint', async () => {
      client.put.mockResolvedValue({ data: { status: 'success', message: 'Updated!' } });
      const nameInput = await openEditForm();
      expect(nameInput).toHaveValue('Old Timer');
      fireEvent.change(screen.getByLabelText(/Duck Reward/i), { target: { name: 'reward', value: '30' } });

      submitForm();

      await waitFor(() => expect(client.put).toHaveBeenCalledTimes(1));
      const [url, body] = client.put.mock.calls[0];
      expect(url).toBe('/api/achievements/edit/5');
      expect(body.get('reward')).toBe('30');
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Updated!'));
    });

    it('shows the server message when the edit response is not a success', async () => {
      client.put.mockResolvedValue({ data: { status: 'error', message: 'Nope.' } });
      await openEditForm();

      submitForm();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nope.'));
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('applies the slug pattern when the slug is changed', async () => {
      await openEditForm();
      const slug = screen.getByLabelText(/Slug/i);
      expect(slug).not.toHaveAttribute('pattern');

      fireEvent.change(slug, { target: { name: 'slug', value: 'Bad Slug' } });

      expect(slug).toHaveAttribute('pattern', '[a-z0-9\\-]+');
    });

    it('keeps an unchanged legacy slug editable', async () => {
      await openEditForm(legacy);
      expect(screen.getByLabelText(/Slug/i)).toHaveValue('Legacy_Slug');
      expect(screen.getByLabelText(/Slug/i)).not.toHaveAttribute('pattern');
    });
  });
});
