import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Linkify from './Linkify';

describe('Linkify Component', () => {
  it('renders plain text as span', () => {
    render(<Linkify text="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders URLs as clickable anchor tags', () => {
    render(<Linkify text="Check out https://google.com" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://google.com');
    expect(link).toHaveTextContent('https://google.com');
    expect(screen.getByText(/Check out/)).toBeInTheDocument();
  });

  it('renders www URLs with http prefix', () => {
    render(<Linkify text="Check out www.google.com" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'http://www.google.com');
    expect(link).toHaveTextContent('www.google.com');
  });

  it('handles multiple URLs in text', () => {
    render(<Linkify text="https://a.com and http://b.com" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://a.com');
    expect(links[1]).toHaveAttribute('href', 'http://b.com');
  });

  it('returns null if no text provided', () => {
    const { container } = render(<Linkify text="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
