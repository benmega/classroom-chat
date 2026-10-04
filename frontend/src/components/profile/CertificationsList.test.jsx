import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CertificationsList from './CertificationsList';
import * as apiUrlModule from '../../utils/apiUrl';

describe('CertificationsList', () => {
    it('returns null if no certificates', () => {
        const { container } = render(<CertificationsList certificates={[]} />, { wrapper: MemoryRouter });
        expect(container.firstChild).toBeNull();
    });

    it('renders a certificate with a file as a link that opens it in a new tab', () => {
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
        const link = screen.getByRole('link', { name: /Test Cert/ });
        expect(link).toHaveClass('cert-item');
        expect(link).toHaveAttribute('href', 'http://mock/api/achievements/view_certificate/1');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders a certificate without a file as a plain item that is not a tab stop', () => {
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
        expect(certItem.tagName).toBe('DIV');
        expect(certItem).not.toHaveAttribute('role');
        expect(certItem).not.toHaveAttribute('tabindex');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /No File Cert/ })).not.toBeInTheDocument();

        fireEvent.click(certItem);
        expect(window.open).not.toHaveBeenCalled();
    });

    it('puts only the certificates that have a file into the tab order', async () => {
        const user = userEvent.setup();
        const certs = [
            { id: 5, submitted_at: '2023-01-01T00:00:00Z', file_path: null, achievement: { name: 'Plain Cert', slug: 'plain' } },
            { id: 6, submitted_at: '2023-01-01T00:00:00Z', file_path: 'x', achievement: { name: 'Linked Cert', slug: 'linked' } },
        ];
        render(<CertificationsList certificates={certs} />, { wrapper: MemoryRouter });

        await user.tab();
        expect(screen.getByRole('link', { name: 'Submit Certificate' })).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('link', { name: /Linked Cert/ })).toHaveFocus();
    });

    it('formats the submitted date as month and year', () => {
        const certs = [
            { id: 3, submitted_at: '2023-06-15T12:00:00Z', file_path: 'x', achievement: { name: 'Dated Cert', slug: 'dated' } },
        ];
        const { container } = render(<CertificationsList certificates={certs} />, { wrapper: MemoryRouter });

        expect(container.querySelector('.cert-date').textContent).toBe(
            new Date('2023-06-15T12:00:00Z').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        );
    });

    it.each([null, undefined, '', 'not a date'])('shows no date instead of "Invalid Date" for %p', (submittedAt) => {
        const certs = [
            { id: 4, submitted_at: submittedAt, file_path: 'x', achievement: { name: 'Undated Cert', slug: 'undated' } },
        ];
        const { container } = render(<CertificationsList certificates={certs} />, { wrapper: MemoryRouter });

        expect(screen.getByText('Undated Cert')).toBeInTheDocument();
        expect(container.querySelector('.cert-date')).toBeNull();
        expect(container).not.toHaveTextContent('Invalid Date');
        expect(container).not.toHaveTextContent('1970');
    });
});
