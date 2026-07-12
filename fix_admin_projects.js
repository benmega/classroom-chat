const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/Admin/AdminProjects.jsx', 'utf8');

const replacements = [
    {
        from: `className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}`,
        to: `className="section-title d-flex align-center gap-8"`
    },
    {
        from: `style={{ display: 'flex', alignItems: 'center', gap: '8px' }}`,
        to: `className="d-flex align-center gap-8"`
    },
    {
        from: `style={{ display: 'flex', alignItems: 'center', gap: '6px' }}`,
        to: `className="d-flex align-center gap-6"`
    },
    {
        from: `style={{ marginBottom: '20px' }}`,
        to: `className="mb-20"`
    },
    {
        from: `className="controls-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', minHeight: '38px' }}`,
        to: `className="controls-bar admin-projects-controls-wrapper"`
    },
    {
        from: `className="admin-project-back-btn"\n                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}`,
        to: `className="admin-project-back-btn btn-small"`
    },
    {
        from: `style={{ textAlign: 'center' }}`,
        to: `className="text-center"`
    },
    {
        from: `className="th-filter-container" style={{ textAlign: 'center', position: 'relative' }}`,
        to: `className="th-filter-container text-center pos-rel"`
    },
    {
        from: `style={{ margin: '0 auto' }}`,
        to: `className="mx-auto"`
    },
    {
        from: `className="users-table-container card" style={{ overflow: 'visible' }}`,
        to: `className="users-table-container card overflow-visible"`
    },
    {
        from: `className="users-table" style={{ overflow: 'visible' }}`,
        to: `className="users-table overflow-visible"`
    },
    {
        from: `className="th-filter-container" style={{ position: 'relative' }}`,
        to: `className="th-filter-container pos-rel"`
    },
    {
        from: `style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }}`,
        to: `className="filter-search-input"`
    },
    {
        from: `className="excel-filter-dropdown" style={{ left: '50%', transform: 'translateX(-50%)' }}`,
        to: `className="excel-filter-dropdown center-dropdown"`
    },
    {
        from: `className="excel-filter-dropdown" style={{ right: 0 }}`,
        to: `className="excel-filter-dropdown right-dropdown"`
    },
    {
        from: `}} style={{ cursor: 'pointer' }}>`,
        to: `}} className="cursor-pointer">`
    },
    {
        from: `className="project-title-cell" style={{ fontWeight: '700', color: 'var(--slate-800)' }}`,
        to: `className="project-title-cell title-bold"`
    },
    {
        from: `className="student-info-cell" style={{ fontWeight: '600', color: 'var(--text-secondary)' }}`,
        to: `className="student-info-cell title-semi"`
    },
    {
        from: `className="review-input"\n                                    style={{\n                                        width: '100%',\n                                        padding: '12px 16px',\n                                        borderRadius: '8px',\n                                        border: '1px solid var(--border-color)',\n                                        backgroundColor: 'var(--bg-card)',\n                                        color: 'var(--text-main)',\n                                        fontSize: '15px',\n                                        fontWeight: '500',\n                                        transition: 'border-color 0.2s, box-shadow 0.2s',\n                                        outline: 'none'\n                                    }}`,
        to: `className="review-input packet-reward-input"`
    },
    {
        from: `style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}`,
        to: `className="d-flex align-center justify-center gap-6"`
    },
    {
        from: `style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-color)', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}`,
        to: `className="btn-assign-project-styled"`
    },
    {
        from: `style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}`,
        to: `className="reward-help-text"`
    }
];

replacements.forEach(r => {
    content = content.split(r.from).join(r.to);
});

fs.writeFileSync('frontend/src/pages/Admin/AdminProjects.jsx', content);
console.log('Done');
