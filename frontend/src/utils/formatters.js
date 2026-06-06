export const formatLargeNumber = (num) => {
    if (num === null || num === undefined) return '0';
    const val = Number(num);
    if (isNaN(val)) return '0';
    
    if (val < 10000) {
        return val.toLocaleString(undefined, { maximumFractionDigits: 3 });
    }
    
    const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
    });
    return formatter.format(val);
};

export const formatConversationTitle = (title) => {
    if (!title) return 'Conversation';
    if (title.startsWith('Conversation started by User') && title.includes(' at ')) {
      const parts = title.split(' at ');
      if (parts.length >= 2) {
        const datePart = parts[1].split('.')[0];
        const date = new Date(datePart.replace(' ', 'T'));
        if (!isNaN(date)) {
          return `Chat on ${date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}`;
        }
      }
    }
    return title;
};

import { getApiUrl } from './apiUrl';

export const formatStaticUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    
    // Pass through getApiUrl so that dynamic /user/... assets are routed to the backend
    const formattedUrl = url.startsWith('/') ? url : `/static/${url}`;
    return getApiUrl(formattedUrl);
};
