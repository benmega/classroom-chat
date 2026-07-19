import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CertificationsList from './CertificationsList';
import * as apiUrlModule from '../../utils/apiUrl';

describe('CertificationsList', () => {
    it('returns null if no certificates', () => {
        const { container } = render(<CertificationsList certificates={[]} />, { wrapper: MemoryRouter });
        expect(container.firstChild).toBeNull();
    });

    it('renders certificates and handles click', () => {
        vi.spyOn(window, 'open').mockImplementation(() => {});
        vi.spyOn(apiUrlModule, 'getApiUrl').mockImplementation(path => `http://mock${path}`);

        const mockCerts = [
            {
                id: 1,
                submitted_at: '2023-01-01T00:00:00Z',
                file_path: '/path/to/cert',
                achievement: {
                    name: 'Test Cert',
                    slug: 'test-cert'
                }
            }
        ];

        render(<CertificationsList certificates={mockCerts} />, { wrapper: MemoryRouter });

        expect(screen.getByText('Certifications')).toBeInTheDocument();
        expect(screen.getByText('Test Cert')).toBeInTheDocument();

        const certItem = screen.getByText('Test Cert').closest('.cert-item');
        fireEvent.click(certItem);

        expect(window.open).toHaveBeenCalledWith('http://mock/api/achievements/view_certificate/1', '_blank');
    });

    it('handles certificate with no file_path gracefully', () => {
        vi.spyOn(window, 'open').mockImplementation(() => {});
        const mockCerts = [
            {
                id: 2,
                submitted_at: '2023-01-01T00:00:00Z',
                file_path: null,
                achievement: {
                    name: 'No File Cert',
                    slug: 'no-file'
                }
            }
        ];

        render(<CertificationsList certificates={mockCerts} />, { wrapper: MemoryRouter });

        const certItem = screen.getByText('No File Cert').closest('.cert-item');
        fireEvent.click(certItem);

        expect(window.open).not.toHaveBeenCalled();
    });
});
