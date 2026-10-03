import React from 'react';

const CLOSING_BRACKETS = { ')': '(', ']': '[', '}': '{' };

const countChar = (str, ch) => str.split(ch).length - 1;

/**
 * A matched URL can end in characters that belong to the surrounding sentence:
 * the ')' of "(see https://a.com)", the quote of '"https://a.com"', a '>' ...
 * Splits those off so they render as plain text after the link. A closing bracket
 * is kept while it is balanced inside the URL, e.g. https://en.wikipedia.org/wiki/Foo_(bar).
 */
const splitTrailing = (match) => {
  let end = match.length;
  while (end > 0) {
    const ch = match[end - 1];
    const opener = CLOSING_BRACKETS[ch];
    if (opener) {
      const body = match.slice(0, end);
      if (countChar(body, opener) >= countChar(body, ch)) break;
    } else if (!/[>'".,!?;:]/.test(ch)) {
      break;
    }
    end -= 1;
  }
  return { url: match.slice(0, end), trailing: match.slice(end) };
};

/**
 * Linkify Component
 * Finds URLs in text and converts them into clickable anchor tags.
 * Styled with premium aesthetics to match ClassroomChat.
 */
const Linkify = ({ text, isUserMessage }) => {
  if (text === null || text === undefined || text === '') return null;
  const str = typeof text === 'string' ? text : String(text);

  // Regex to detect URLs (http, https, www) and ignore trailing punctuation like commas
  const urlRegex = /(https?:\/\/[^\s]+?(?=[.,!?;:]*(?:\s|$))|www\.[^\s]+?(?=[.,!?;:]*(?:\s|$)))/g;

  // Split into link ({ url }) and plain-text ({ text }) pieces, with the sentence
  // characters stuck to the end of a URL moved into a plain-text piece of their own.
  const parts = str.split(urlRegex).flatMap((part) => {
    if (!part.match(urlRegex)) return [{ text: part }];
    const { url, trailing } = splitTrailing(part);
    // Only a scheme or "www." left once the trailing characters are gone: not a link.
    if (!url.replace(/^(?:https?:\/\/|www\.)/, '')) return [{ text: part }];
    return trailing ? [{ url }, { text: trailing }] : [{ url }];
  });

  return (
    <>
      {parts.map(({ url, text: plain }, index) => {
        if (url) {
          const href = url.startsWith('www.') ? `https://${url}` : url;
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: isUserMessage ? 'white' : 'var(--primary-color)',
                textDecoration: 'underline',
                textDecorationThickness: '2px',
                textUnderlineOffset: '3px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                opacity: 0.9,
                wordBreak: 'break-all',
                overflowWrap: 'anywhere'
              }}
              onFocus={() => {}} onMouseOver={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.textDecorationColor = isUserMessage ? 'rgba(255,255,255,0.8)' : 'var(--highlight-hover)';
              }}
              onBlur={() => {}} onMouseOut={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.textDecorationColor = 'currentColor';
              }}
            >
              {url}
            </a>
          );
        }
        return <span key={index} className="text-break-word">{plain}</span>;
      })}
    </>
  );
};

export default Linkify;
