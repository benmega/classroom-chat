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

  it('renders www URLs with an https prefix', () => {
    render(<Linkify text="Check out www.google.com" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.google.com');
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

  it('returns null for null and undefined text', () => {
    const { container: a } = render(<Linkify text={null} />);
    expect(a).toBeEmptyDOMElement();
    const { container: b } = render(<Linkify />);
    expect(b).toBeEmptyDOMElement();
  });

  it('does not throw on non-string text', () => {
    const { container } = render(<Linkify text={123} />);
    expect(container).toHaveTextContent('123');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders text that is falsy but not empty, such as 0', () => {
    const { container } = render(<Linkify text={0} />);
    expect(container).toHaveTextContent('0');
  });

  it('stringifies objects instead of throwing', () => {
    const { container } = render(<Linkify text={{ toString: () => 'see https://a.com' }} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://a.com');
    expect(container).toHaveTextContent('see https://a.com');
  });

  describe('surrounding punctuation', () => {
    const renderText = (text) => render(<Linkify text={text} />);

    it('keeps a trailing period outside the link', () => {
      const { container } = renderText('see https://a.com.');
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://a.com');
      expect(link).toHaveTextContent('https://a.com');
      expect(container).toHaveTextContent('see https://a.com.');
    });

    it('keeps a trailing comma outside a www link', () => {
      const { container } = renderText('go to www.a.com, ok');
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://www.a.com');
      expect(link).toHaveTextContent('www.a.com');
      expect(container).toHaveTextContent('go to www.a.com, ok');
    });

    it.each(['!', '?', ';', ':'])('keeps a trailing %s outside the link', (mark) => {
      renderText(`look https://a.com/page${mark}`);
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://a.com/page');
    });

    it('keeps punctuation inside the URL', () => {
      renderText('open https://a.com/a.b?x=1&y=2#top now');
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://a.com/a.b?x=1&y=2#top');
    });

    it('leaves the parentheses around a URL out of the link', () => {
      const { container } = renderText('(https://a.com)');
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://a.com');
      expect(link.textContent).toBe('https://a.com');
      expect(container).toHaveTextContent('(https://a.com)');
    });

    it('handles a parenthesised URL followed by punctuation', () => {
      const { container } = renderText('(see https://a.com/x).');
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://a.com/x');
      expect(container).toHaveTextContent('(see https://a.com/x).');
    });

    it('keeps balanced parentheses that belong to the URL', () => {
      renderText('read https://en.wikipedia.org/wiki/Foo_(bar) today');
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Foo_(bar)');
    });

    it('splits off only the unbalanced parenthesis after a balanced one', () => {
      const { container } = renderText('(https://en.wikipedia.org/wiki/Foo_(bar))');
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Foo_(bar)');
      expect(container).toHaveTextContent('(https://en.wikipedia.org/wiki/Foo_(bar))');
    });

    it('leaves quotes and angle brackets around a URL out of the link', () => {
      const text = `"https://a.com" and <https://b.com> and 'https://c.com'`;
      const { container } = renderText(text);
      const links = screen.getAllByRole('link');
      expect(links.map((l) => l.getAttribute('href'))).toEqual(['https://a.com', 'https://b.com', 'https://c.com']);
      expect(container).toHaveTextContent(text);
    });

    it('trims square and curly brackets only when unbalanced', () => {
      renderText('[https://a.com] {https://b.com/x{1}}');
      const links = screen.getAllByRole('link');
      expect(links.map((l) => l.getAttribute('href'))).toEqual(['https://a.com', 'https://b.com/x{1}']);
    });

    it('exposes punctuation that was hiding behind a bracket', () => {
      const { container } = renderText('(https://a.com/x.)');
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://a.com/x');
      expect(container).toHaveTextContent('(https://a.com/x.)');
    });

    it('does not make a link out of a bare scheme', () => {
      const { container } = renderText('weird https://) text');
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(container).toHaveTextContent('weird https://) text');
    });
  });
});
