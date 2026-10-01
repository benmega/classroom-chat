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

// CSS background-image value for a static/uploaded image. An unquoted url() breaks on
// spaces and parentheses (legacy names like "Tepun - Text-Based Adventure (2).jpg"),
// so quote it and percent-encode those characters, keeping any existing %XX escapes.
export const cssUrl = (url) => {
    const formatted = formatStaticUrl(url);
    if (!formatted) return 'none';
    const encoded = encodeURI(formatted)
        .replace(/%25([0-9A-Fa-f]{2})/g, '%$1')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
    return `url("${encoded}")`;
};

export const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Never';
    
    // Append 'Z' if not present to force UTC parsing
    const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
