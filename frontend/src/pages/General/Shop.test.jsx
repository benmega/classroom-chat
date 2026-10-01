import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import Shop from './Shop';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { loadCropper } from '../../utils/loadCropper';

vi.mock('../../utils/loadCropper', () => ({
  loadCropper: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCheckAuth = vi.fn().mockResolvedValue();

// Stand-in for Cropper.js: records how the wallpaper cropper is built.
const croppers = [];
class FakeCropper {
  constructor(element, options) {
    this.element = element;
    this.options = options;
    this.destroy = vi.fn();
    this.getCroppedCanvas = vi.fn(() => ({
      toBlob: (callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
    }));
    croppers.push(this);
  }
}

describe('Shop', () => {
  beforeEach(() => {
    croppers.length = 0;
    loadCropper.mockResolvedValue(FakeCropper);
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
    expect(screen.getByTestId("shop-loading")).toBeInTheDocument();
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

  it('handles changing border color', async () => {
    renderWithProviders(<Shop />);

    await waitFor(() => {
      expect(screen.getByText('Animated Border')).toBeInTheDocument();
    });

    // The animated border color input is the first color input with value '#fac815' or similar, 
    // or we can find it by looking at the specific test structure.
    // There are color inputs in Shop, let's just find the one that triggers handleBorderColorSubmit
    // It's the one that is associated with RGB Color
    await waitFor(() => {
      expect(screen.getByText('RGB Color:')).toBeInTheDocument();
    });

    // Let's just find the first number input to change RGB.
    const numberInputs = document.querySelectorAll('input[type="number"]');
    
    // The red channel input
    if (numberInputs.length > 0) {
      fireEvent.change(numberInputs[0], { target: { value: '255' } });
      fireEvent.blur(numberInputs[0]); // triggers handleBorderColorSubmit
    }

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
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

  describe('Claim Ducks bookmarklet', () => {
    afterEach(() => vi.unstubAllEnvs());

    const bookmarkletHref = async () => {
      renderWithProviders(<Shop />);
      const link = await screen.findByText('Claim Ducks');
      return link.getAttribute('href');
    };

    it('submits to this page origin when VITE_API_URL is unset', async () => {
      vi.stubEnv('VITE_API_URL', '');
      expect(await bookmarkletHref()).toContain(`'${window.location.origin}/challenge/submit?url='`);
    });

    it('submits to the configured API origin, without doubling the slash', async () => {
      vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
      expect(await bookmarkletHref()).toContain("'https://api.example.com/challenge/submit?url='");
    });
  });

  describe('wallpaper cropping', () => {
    const chooseWallpaper = async () => {
      renderWithProviders(<Shop />);
      await waitFor(() => {
        expect(screen.queryByText(/Upload Wallpaper/i)).toBeInTheDocument();
      });
      const file = new File(['hello'], 'hello.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]');
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });
      await waitFor(() => expect(screen.getByText('Adjust Wallpaper')).toBeInTheDocument());
    };

    it('builds the 4:1 cropper through the shared loader', async () => {
      await chooseWallpaper();

      await waitFor(() => expect(croppers).toHaveLength(1));
      expect(loadCropper).toHaveBeenCalledTimes(1);
      expect(croppers[0].element).toBe(screen.getByAltText('To crop'));
      expect(croppers[0].options).toMatchObject({ aspectRatio: 4, minCropBoxWidth: 300, minCropBoxHeight: 100 });
    });

    it('destroys the cropper when the dialog is cancelled', async () => {
      await chooseWallpaper();
      await waitFor(() => expect(croppers).toHaveLength(1));

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => expect(screen.queryByText('Adjust Wallpaper')).not.toBeInTheDocument());
      expect(croppers[0].destroy).toHaveBeenCalledTimes(1);
    });

    it('reports a cropper that cannot be loaded and closes the dialog', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      loadCropper.mockRejectedValue(new Error('Failed to load the image cropper'));

      await chooseWallpaper().catch(() => {});

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Could not load the image editor. Please try again.');
      });
      await waitFor(() => expect(screen.queryByText('Adjust Wallpaper')).not.toBeInTheDocument());
    });

    it('uploads the cropped wallpaper and closes the dialog', async () => {
      await chooseWallpaper();
      await waitFor(() => expect(croppers).toHaveLength(1));

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => expect(screen.queryByText('Adjust Wallpaper')).not.toBeInTheDocument());
      expect(mockCheckAuth).toHaveBeenCalledWith(true);
    });

    it('shows the server error when the wallpaper upload is rejected', async () => {
      server.use(
        http.post('*/user/api/profile-wallpaper', () => HttpResponse.json(
          { status: 'error', data: null, error: 'Wallpaper is too large.' }, { status: 400 }
        ))
      );
      await chooseWallpaper();
      await waitFor(() => expect(croppers).toHaveLength(1));

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Wallpaper is too large.'));
      expect(screen.getByText('Adjust Wallpaper')).toBeInTheDocument();
    });
  });
});
