const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/admin/AdminModals.jsx', 'utf8');

const replacements = [
    { from: `style={{ position: 'relative' }}`, to: `className="pos-rel"` },
    { from: `style={{ paddingRight: '2.5rem' }}`, to: `className="pr-2-5rem"` },
    { from: `style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}`, to: `className="password-toggle-btn"` },
    { from: `style={{ color: 'var(--error-color)' }}`, to: `className="text-error"` },
    { from: `style={{ background: 'var(--gradient-error)' }}`, to: `className="bg-gradient-error"` },
    { from: `style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px', background: 'var(--bg-secondary)' }}`, to: `className="students-list-container"` },
    { from: `style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}`, to: `className="text-muted text-sm text-center"` },
    { from: `style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}`, to: `className="student-list-item"` },
    { from: `style={{ display: 'flex', alignItems: 'center', gap: '10px' }}`, to: `className="d-flex align-center gap-10px"` },
    { from: `style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}`, to: `className="w-32px h-32px radius-8 object-cover"` },
    { from: `style={{ fontWeight: '600', fontSize: '0.9rem' }}`, to: `className="fw-semibold text-sm"` },
    { from: `style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}`, to: `className="text-xs text-muted"` },
    { from: `style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}`, to: `className="btn-small-link"` },
    { from: `style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}`, to: `className="d-flex justify-end mt-20px"` },
    { from: `style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer' }}`, to: `className="btn-secondary-styled"` },
    { from: `style={{ textAlign: 'center', padding: '1rem' }}`, to: `className="text-center p-1rem"` },
    { from: `style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}`, to: `className="mb-1-5rem text-muted"` },
    { from: `style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}`, to: `className="connection-card-preview"` },
    { from: `style={{ margin: '0 0 0.25rem 0', color: 'var(--slate-800)' }}`, to: `className="m-0 mb-xs text-slate-800"` },
    { from: `style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}`, to: `className="text-sm text-muted mb-md"` },
    { from: `style={{ width: '200px', height: '200px' }}`, to: `className="w-200px h-200px"` },
    { from: `style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px dashed var(--border-rich)' }}`, to: `className="connection-code-container"` },
    { from: `style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}`, to: `className="text-sm text-muted d-block mb-4px"` },
    { from: `style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '4px', color: 'var(--text-primary)' }}`, to: `className="connection-code-text"` },
    { from: `style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}`, to: `className="mt-2rem d-flex gap-md justify-center"` },
    { from: `style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)' }}`, to: `className="btn-secondary-print"` },
    { from: `style={{ padding: '1rem' }}`, to: `className="p-1rem"` },
    { from: `style={{ marginBottom: '1.5rem' }}`, to: `className="mb-1-5rem"` },
    { from: `style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}`, to: `className="fw-semibold mb-sm d-block"` },
    { from: `style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-color)' }}`, to: `className="select-styled-full"` },
    { from: `style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}`, to: `className="text-center p-3rem text-muted"` },
    { from: `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}`, to: `className="d-flex justify-between align-center mb-1-5rem"` },
    { from: `style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}`, to: `className="text-muted text-sm"` },
    { from: `style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}`, to: `className="btn-primary-styled-print"` },
    { from: `style={{ marginBottom: '2px' }}`, to: `className="mb-2px"` },
    { from: `style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textAlign: 'center', wordBreak: 'break-all' }}`, to: `className="text-0-85rem text-muted mb-0-75rem text-center break-all"` },
    { from: `style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: '12px' }}`, to: `className="text-center p-4rem-2rem text-muted border-dashed-2 radius-12"` },
    { from: `style={{ fontSize: '1.1rem', margin: 0 }}`, to: `className="text-1-1rem m-0"` }
];

replacements.forEach(r => {
    content = content.split(r.from).join(r.to);
});

fs.writeFileSync('frontend/src/components/admin/AdminModals.jsx', content);

let duckContent = fs.readFileSync('frontend/src/components/Icons/DuckIcon.jsx', 'utf8');
duckContent = duckContent.replace(/className={\`duck-icon \$\{className\}\`}\n\s*style={{\n\s*display: 'inline-block',\n\s*verticalAlign: 'middle',\n\s*transition: 'transform 0.25s cubic-bezier\\(0.175, 0.885, 0.32, 1.275\\)',\n\s*filter: 'drop-shadow\\(0 1px 1px rgba\\(0,0,0,0.1\\)\\)',\n\s*\.\.\.style\n\s*}}/g, 'className={`duck-icon duck-icon-styled ${className}`} style={style}');
fs.writeFileSync('frontend/src/components/Icons/DuckIcon.jsx', duckContent);

if (fs.existsSync('frontend/src/App.jsx')) {
    let appContent = fs.readFileSync('frontend/src/App.jsx', 'utf8');
    appContent = appContent.replace(/style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}/g, 'className="app-loading-screen"');
    fs.writeFileSync('frontend/src/App.jsx', appContent);
}

console.log("Phase 5 done.");
