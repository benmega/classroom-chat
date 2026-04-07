import React from 'react';

/**
 * Linkify Component
 * Finds URLs in text and converts them into clickable anchor tags.
 * Styled with premium aesthetics to match ClassroomChat.
 */
const Linkify = ({ text, isUserMessage }) => {
  if (!text) return null;

  // Regex to detect URLs (http, https, www)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          const href = part.startsWith('www.') ? `http://${part}` : part;
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
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.textDecorationColor = isUserMessage ? 'rgba(255,255,255,0.8)' : 'var(--highlight-hover)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.textDecorationColor = 'currentColor';
              }}
            >
              {part}
            </a>
          );
        }
        return <span key={index} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{part}</span>;
      })}
    </>
  );
};

export default Linkify;
