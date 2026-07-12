const fs = require('fs');

const files = [
    'frontend/src/pages/Admin/AdminUserDashboard.jsx',
    'frontend/src/pages/Admin/AdvancedPanel.jsx',
    'frontend/src/pages/Admin/Classes.jsx',
    'frontend/src/pages/Admin/DuckTransactions.jsx',
    'frontend/src/pages/Admin/PendingTrades.jsx',
    'frontend/src/pages/Admin/Users.jsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Common replacements
    content = content.replace(/style={{ cursor: 'pointer' }}/g, 'className="cursor-pointer"');
    content = content.replace(/style={{ fontWeight: '500' }}/g, 'className="fw-medium"');
    content = content.replace(/style={{ fontWeight: '600' }}/g, 'className="fw-semibold"');
    content = content.replace(/style={{ textAlign: 'center' }}/g, 'className="text-center"');
    content = content.replace(/style={{ display: 'none' }}/g, 'className="d-none"');
    
    // AdminUserDashboard.jsx
    if (file.includes('AdminUserDashboard.jsx')) {
        content = content.replace(/<h3 style={{color: '#ef4444'}}>/g, '<h3 className="danger-zone-title">');
        content = content.replace(/<p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>/g, '<p className="danger-zone-desc">');
        content = content.replace(/style={{width: 'fit-content'}}/g, 'className="w-fit-content"');
    }
    
    // AdvancedPanel.jsx
    if (file.includes('AdvancedPanel.jsx')) {
        content = content.replace(/style={{ padding: '2rem' }}/g, 'className="p-2rem"');
        content = content.replace(/style={{ marginBottom: '2rem' }}/g, 'className="mb-2rem"');
        content = content.replace(/style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}/g, 'className="utility-card-styled"');
        content = content.replace(/style={{ flexShrink: 0 }}/g, 'className="flex-shrink-0"');
        content = content.replace(/style={{ flexGrow: 1 }}/g, 'className="flex-1"');
        content = content.replace(/style={{ marginBottom: '8px' }}/g, 'className="mb-sm"');
        content = content.replace(/style={{ marginBottom: '1.25rem' }}/g, 'className="mb-1-25rem"');
    }

    // Classes.jsx
    if (file.includes('Classes.jsx')) {
        content = content.replace(/style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}/g, 'className="text-truncate"');
        content = content.replace(/style={{ fontWeight: '600' }}/g, 'className="fw-semibold"');
        content = content.replace(/style={{ fontFamily: 'monospace', padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: '6px' }}/g, 'className="font-mono bg-secondary badge-rounded"');
        content = content.replace(/style={{ padding: '4px 8px', background: 'rgba\\(59, 130, 246, 0.1\\)', color: 'var\\(--primary-color\\)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500' }}/g, 'className="language-badge-styled"');
    }

    // DuckTransactions.jsx
    if (file.includes('DuckTransactions.jsx')) {
        content = content.replace(/style={{ padding: '1rem' }}/g, 'className="p-1rem"');
        content = content.replace(/style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var\\(--border-subtle\\)' }}/g, 'className="transaction-item-styled"');
        content = content.replace(/style={{ display: 'flex', gap: '12px', alignItems: 'center' }}/g, 'className="d-flex align-center gap-12"');
    }

    // PendingTrades.jsx
    if (file.includes('PendingTrades.jsx')) {
        content = content.replace(/style={{ padding: '2rem' }}/g, 'className="p-2rem"');
        content = content.replace(/style={{ marginBottom: '2rem' }}/g, 'className="mb-2rem"');
        content = content.replace(/style={{ padding: '1.5rem', marginBottom: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}/g, 'className="trade-card-styled"');
        content = content.replace(/style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}/g, 'className="d-flex justify-between align-center mb-md"');
        content = content.replace(/style={{ display: 'flex', alignItems: 'center', gap: '12px' }}/g, 'className="d-flex align-center gap-12"');
        content = content.replace(/style={{ marginBottom: '4px' }}/g, 'className="mb-4px"');
        content = content.replace(/style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}/g, 'className="d-flex gap-md mt-1-5rem"');
    }

    fs.writeFileSync(file, content);
});

console.log("Done phase 2.");
