import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import Shop from './Shop';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCheckAuth = vi.fn().mockResolvedValue();

describe('Shop', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'testuser',
        role: 'student',
        packets: 100,
        chat_font_color: '#ff0000',
        animated_border_speed: 'normal'
      },
      checkAuth: mockCheckAuth
    });

    server.use(
      http.get('*/api/shop/items', () => {
        return HttpResponse.json([
          { id: 1, name: 'Profile Theme', description: 'desc', base_price: 10, is_purchased: false },
          { id: 2, name: 'Chat Font Color', description: 'desc', base_price: 20, is_purchased: true },
          { id: 3, name: 'Animated Profile Border', description: 'desc', base_price: 150, is_purchased: true },
          { id: 4, name: 'Custom Profile Wallpaper', description: 'desc', base_price: 30, is_purchased: true },
          { id: 5, name: 'Auto Challenge Claimer', description: 'desc', base_price: 40, is_purchased: true },
          { id: 6, name: 'Auto Bitshift', description: 'desc', base_price: 50, is_purchased: true },
          { id: 7, name: 'Permanent Double Duck', description: 'desc', base_price: 60, is_purchased: true },
        ]);
      }),
      http.post('*/api/shop/purchase/:id', ({ params }) => {
        if (params.id === '1') {
          return HttpResponse.json({ success: true });
        }
        return HttpResponse.json({ message: 'Failed to purchase Error Item' }, { status: 400 });
      }),
      http.put('*/api/shop/configure', () => {
        return HttpResponse.json({ success: true });
      }),
      http.post('*/user/api/profile-wallpaper', () => {
        return HttpResponse.json({ success: true });
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<Shop />);
    expect(document.querySelector('.shop-loading')).toBeInTheDocument();
  });

  it('renders items and handles purchase success', async () => {
    renderWithProviders(<Shop />);

    await waitFor(() => {
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });

    const purchaseButtons = screen.getAllByText('10.000 Packets');
    expect(purchaseButtons.length).toBeGreaterThan(0);
    
    // Click purchase button
    fireEvent.click(purchaseButtons[0]);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Successfully unlocked Profile Theme!');
    });
  });

  it('handles purchase error', async () => {
    server.use(
      http.get('*/api/shop/items', () => {
        return HttpResponse.json([
          { id: 99, name: 'Error Item', description: 'desc', base_price: 10, is_purchased: false },
        ]);
      })
    );

    renderWithProviders(<Shop />);

    await waitFor(() => {
      expect(screen.getByText('Error Item')).toBeInTheDocument();
    });

    const purchaseButton = screen.getByText('10.000 Packets');
    fireEvent.click(purchaseButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to purchase Error Item');
    });
  });

  it('handles changing chat font color', async () => {
    renderWithProviders(<Shop />);

    await waitFor(() => {
      expect(document.querySelector('input[type="color"]')).toBeInTheDocument();
    });

    const colorInputs = document.querySelectorAll('input[type="color"]');
    expect(colorInputs.length).toBeGreaterThan(1);
    
    // The second input is the one in the actions section which has the onBlur handler
    const actionColorInput = colorInputs[1];
    fireEvent.change(actionColorInput, { target: { value: '#00ff00' } });
    fireEvent.blur(actionColorInput); // trigger handleColorSubmit

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
    });
  });

  it('handles changing border speed', async () => {
    renderWithProviders(<Shop />);

    await waitFor(() => {
      expect(document.querySelector('select')).toBeInTheDocument();
    });

    const speedSelect = screen.getByRole('combobox');
    fireEvent.change(speedSelect, { target: { value: 'fast' } });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Animation speed updated!');
    });
  });

  it('handles wallpaper upload (clicking the button)', async () => {
    renderWithProviders(<Shop />);

    await waitFor(() => {
      expect(screen.queryByText(/Upload Wallpaper/i)).toBeInTheDocument();
    });

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');
    
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // After the file is selected, the upload section should still be visible
    expect(screen.queryByText(/Upload Wallpaper/i)).toBeInTheDocument();
  });


});
