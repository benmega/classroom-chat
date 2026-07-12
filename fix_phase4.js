const fs = require('fs');
const path = require('path');

const files = [
    'frontend/src/pages/Auth/ForgotPassword.jsx',
    'frontend/src/pages/Auth/ResetPassword.jsx',
    'frontend/src/pages/Auth/Signup.jsx',
    'frontend/src/pages/Chat/Chat.jsx',
    'frontend/src/pages/Error/ServerOffline.jsx',
    'frontend/src/pages/General/Achievements.jsx',
    'frontend/src/pages/General/BitShift.jsx',
    'frontend/src/pages/General/CourseLevelBreakdown.jsx',
    'frontend/src/pages/General/CourseProgressTree.jsx',
    'frontend/src/pages/General/History.jsx',
    'frontend/src/pages/General/LandingDesktop.jsx',
    'frontend/src/pages/General/LandingMobile.jsx',
    'frontend/src/pages/General/Shop.jsx',
    'frontend/src/pages/General/StudentParentCode.jsx',
    'frontend/src/pages/General/SubmitChallenge.jsx',
    'frontend/src/pages/Parent/ParentDashboard.jsx'
];

const replacements = [
    { from: `style={{ marginTop: '1.5rem' }}`, to: `className="mt-1-5rem"` },
    { from: `style={{ marginLeft: '0.5rem' }}`, to: `className="ml-sm"` },
    { from: `style={{ padding: '2rem' }}`, to: `className="p-2rem"` },
    { from: `style={{ display: 'none' }}`, to: `className="d-none"` },
    { from: `style={{ width: '100%' }}`, to: `className="w-100"` },
    { from: `style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}`, to: `className="d-flex flex-col gap-1-5rem"` },
    { from: `style={{ display: 'flex', gap: '1rem', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}`, to: `className="chat-skeleton-message"` },
    { from: `style={{ flexShrink: 0 }}`, to: `className="flex-shrink-0"` },
    { from: `style={{ flexGrow: 1 }}`, to: `className="flex-1"` },
    { from: `style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}`, to: `className="d-flex gap-sm mb-sm align-center"` },
    { from: `style={{ marginBottom: '6px' }}`, to: `className="mb-6px"` },
    { from: `style={{ marginTop: '2rem', opacity: 0.6 }}`, to: `className="mt-2rem opacity-60"` },
    { from: `style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}`, to: `className="chat-skeleton-input"` },
    { from: `style={{ marginBottom: '1rem' }}`, to: `className="mb-md"` },
    { from: `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}`, to: `className="d-flex justify-between align-center"` },
    { from: `style={{ position: 'relative', display: 'inline-block' }}`, to: `className="pos-rel d-inline-block"` },
    { from: `style={{ position: 'relative' }}`, to: `className="pos-rel"` },
    { from: `style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}`, to: `className="d-flex justify-center mt-sm"` },
    { from: `style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}`, to: `className="course-progress-modal-container"` },
    { from: `style={{ marginBottom: '2rem' }}`, to: `className="mb-2rem"` },
    { from: `style={{ maxWidth: '100%', boxShadow: 'none', padding: '0', background: 'transparent' }}`, to: `className="course-modal-content-styled"` },
    { from: `style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}`, to: `className="mb-1-5rem text-primary"` },
    { from: `style={{ marginBottom: '2.5rem' }}`, to: `className="mb-2-5rem"` },
    { from: `style={{ height: '12px' }}`, to: `className="h-12px"` },
    { from: `style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.75rem' }}`, to: `className="text-md text-secondary d-block mt-0-75rem"` },
    { from: `style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}`, to: `className="mb-md text-primary"` },
    { from: `style={{ overflowY: 'visible', gap: '0.75rem' }}`, to: `className="overflow-y-visible gap-0-75rem"` },
    { from: `style={{ padding: '1rem 1.25rem' }}`, to: `className="p-1rem-1-25rem"` },
    { from: `style={{ fontSize: '1.05rem' }}`, to: `className="text-1-05rem"` },
    { from: `style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-md)' }}`, to: `className="text-muted text-center p-2rem bg-surface-sec radius-md"` },
    { from: `style={{ padding: '2rem', textAlign: 'center' }}`, to: `className="p-2rem text-center"` },
    { from: `style={{ marginTop: '1rem' }}`, to: `className="mt-md"` },
    { from: `style={{ position: 'relative', overflow: 'hidden' }}`, to: `className="pos-rel overflow-hidden"` },
    { from: `style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}`, to: `className="pos-rel z-1 d-flex flex-col align-center gap-4px"` },
    { from: `style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 'normal' }}`, to: `className="text-sm opacity-80 fw-normal"` },
    { from: `style={{ cursor: 'pointer' }}`, to: `className="cursor-pointer"` },
    { from: `style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }}`, to: `className="mr-4px align-middle mb-2px"` },
    { from: `style={{ cursor: 'default' }}`, to: `className="cursor-default"` },
    { from: `style={{ flex: 1 }}`, to: `className="flex-1"` },
    { from: `style={{ marginTop: '10px' }}`, to: `className="mt-10px"` },
    { from: `style={{ width: '32px', height: '32px' }}`, to: `className="w-32px h-32px"` },
    { from: `style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}`, to: `className="landing-title"` },
    { from: `style={{color: 'var(--primary-color)'}}`, to: `className="text-primary-color"` },
    { from: `style={{ animationDelay: '0.1s', fontSize: '1.25rem' }}`, to: `className="landing-subtitle"` },
    { from: `style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: '1rem' }}`, to: `className="landing-cta"` },
    { from: `style={{ objectFit: 'cover' }}`, to: `className="object-cover"` },
    { from: `style={{ fontSize: '1.25rem' }}`, to: `className="text-1-25rem"` },
    { from: `style={{ alignItems: 'center', textAlign: 'center' }}`, to: `className="align-center text-center"` },
    { from: `style={{ fontSize: '2.5rem', lineHeight: '1.1' }}`, to: `className="landing-mobile-title"` },
    { from: `style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}`, to: `className="parent-grid-layout"` },
    { from: `style={{ padding: '2rem', height: '400px' }}`, to: `className="p-2rem h-400px"` },
    { from: `style={{ marginBottom: '1.5rem' }}`, to: `className="mb-1-5rem"` },
    { from: `style={{ padding: '2rem', height: '200px' }}`, to: `className="p-2rem h-200px"` },
    { from: `style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '2rem', marginTop: '1rem' }}`, to: `className="parent-dashboard-layout"` },
    { from: `style={{ padding: '2rem', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}`, to: `className="dashboard-panel-styled"` },
    { from: `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}`, to: `className="panel-header-styled"` },
    { from: `style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}`, to: `className="d-flex align-center gap-0-75rem"` },
    { from: `style={{ fontSize: '1.4rem', margin: 0, fontWeight: '700' }}`, to: `className="panel-title-text"` },
    { from: `style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}`, to: `className="panel-subtitle-text"` },
    { from: `style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}`, to: `className="d-flex flex-col gap-md"` },
    { from: `style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}`, to: `className="d-flex flex-col gap-1-25rem"` },
    { from: `style={{ position: 'relative', display: 'flex', alignItems: 'center' }}`, to: `className="pos-rel d-flex align-center"` },
    { from: `style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}`, to: `className="w-36px h-36px radius-50 object-cover"` },
    { from: `style={{ width: '36px', height: '36px', margin: 0, fontSize: '0.8rem' }}`, to: `className="w-36px h-36px m-0 text-0-8rem"` },
    { from: `style={{ flexGrow: 1, minWidth: 0 }}`, to: `className="flex-1 min-w-0"` },
    { from: `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}`, to: `className="d-flex justify-between align-center gap-sm"` },
    { from: `style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}`, to: `className="text-0-9rem fw-bold text-primary"` },
    { from: `style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}`, to: `className="text-xs text-muted d-flex align-center gap-4px"` },
    { from: `style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}`, to: `className="text-ellipsis-desc"` },
    { from: `style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}`, to: `className="d-flex gap-md align-start"` },
    { from: `style={{ fontSize: '1.75rem' }}`, to: `className="text-1-75rem"` },
    { from: `style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}`, to: `className="m-0 text-xs text-secondary lh-1-5"` },
    { from: `style={{ padding: '1.5rem', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}`, to: `className="dashboard-panel-styled-small"` },
    { from: `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}`, to: `className="panel-header-styled-small"` },
    { from: `style={{ fontSize: '1.1rem', margin: 0, fontWeight: '700' }}`, to: `className="panel-title-small"` },
    { from: `style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}`, to: `className="d-flex gap-0-75rem align-center"` },
    { from: `style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '9px', height: '9px', border: '1.5px solid white' }}`, to: `className="status-dot-small"` },
    { from: `style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}`, to: `className="text-0-85rem fw-bold text-primary"` },
    { from: `style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}`, to: `className="text-xs text-muted"` },
    { from: `style={{ display: 'flex', alignItems: 'center' }}`, to: `className="d-flex align-center"` },
    { from: `style={{ position: 'relative', top: 'auto', right: 'auto' }}`, to: `className="pos-rel top-auto right-auto"` }
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Custom replacements for class merge
    content = content.replace(/className="brand-icon" style={{ width: '32px', height: '32px' }}/g, 'className="brand-icon w-32px h-32px"');
    content = content.replace(/className="brand-icon" style={{ width: '28px', height: '28px' }}/g, 'className="brand-icon w-28px h-28px"');
    content = content.replace(/className="animate-fade-in" style={{ fontSize: 'clamp\\(2.5rem, 5vw, 4rem\\)' }}/g, 'className="animate-fade-in landing-title"');
    content = content.replace(/className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.1s', fontSize: '1.25rem' }}/g, 'className="hero-subtitle animate-fade-in landing-subtitle"');
    content = content.replace(/className="hero-cta animate-fade-in" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: '1rem' }}/g, 'className="hero-cta animate-fade-in landing-cta"');
    content = content.replace(/className="slide" style={{ objectFit: 'cover' }}/g, 'className="slide object-cover"');
    content = content.replace(/className="animate-fade-in" style={{ fontSize: '2.5rem', lineHeight: '1.1' }}/g, 'className="animate-fade-in landing-mobile-title"');
    content = content.replace(/className="hero-content" style={{ alignItems: 'center', textAlign: 'center' }}/g, 'className="hero-content align-center text-center"');

    replacements.forEach(r => {
        content = content.split(r.from).join(r.to);
    });
    
    fs.writeFileSync(file, content);
});

console.log('Phase 4 complete.');
