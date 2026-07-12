const fs = require('fs');

function replaceInFile(filepath, replacements) {
    if (!fs.existsSync(filepath)) return;
    let content = fs.readFileSync(filepath, 'utf8');
    replacements.forEach(r => {
        content = content.split(r.from).join(r.to);
    });
    fs.writeFileSync(filepath, content);
}

// 1. AchievementsList.jsx
replaceInFile('frontend/src/components/profile/AchievementsList.jsx', [
    { from: `className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}`, to: `className="panel-header d-flex justify-between align-center"` },
    { from: `style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}`, to: `className="text-secondary d-flex align-center"` },
    { from: `style={{ cursor: 'pointer' }}`, to: `className="cursor-pointer"` }
]);

// 2. CertificationsList.jsx
replaceInFile('frontend/src/components/profile/CertificationsList.jsx', [
    { from: `className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}`, to: `className="panel-header d-flex justify-between align-center"` },
    { from: `style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}`, to: `className="text-secondary d-flex align-center"` }
]);

// 3. CourseProgress.jsx
replaceInFile('frontend/src/components/profile/CourseProgress.jsx', [
    { from: `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}`, to: `className="d-flex justify-between align-center cursor-pointer"` },
    { from: `style={{ pointerEvents: 'none' }}`, to: `className="pointer-events-none"` },
    { from: `style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}`, to: `className="text-secondary d-flex align-center"` },
    { from: `style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}`, to: `className="cursor-pointer transition-bg"` },
    { from: `style={{ textAlign: 'center', color: 'var(--text-muted)' }}`, to: `className="text-center text-muted"` },
    { from: `style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}`, to: `className="mt-md text-center text-secondary text-sm cursor-pointer"` }
]);

// 4. PfpCropModal.jsx & WallpaperCropModal.jsx
replaceInFile('frontend/src/components/profile/PfpCropModal.jsx', [
    { from: `style={{ maxWidth: '100%' }}`, to: `className="max-w-100"` }
]);
replaceInFile('frontend/src/components/profile/WallpaperCropModal.jsx', [
    { from: `style={{ maxWidth: '100%' }}`, to: `className="max-w-100"` }
]);

// 5. ProfileHeader.jsx
replaceInFile('frontend/src/components/profile/ProfileHeader.jsx', [
    { from: `className="student-activity" style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}`, to: `className="student-activity mt-sm text-sm text-secondary"` },
    { from: `style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', marginRight: '6px' }}`, to: `className="activity-dot"` }
]);

// 6. ProjectPortfolio.jsx
replaceInFile('frontend/src/components/profile/ProjectPortfolio.jsx', [
    { from: `className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}`, to: `className="panel-header d-flex justify-between align-center"` },
    { from: `style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}`, to: `className="text-secondary d-flex align-center"` }
]);

// 7. Linkify.jsx
replaceInFile('frontend/src/components/common/Linkify.jsx', [
    { from: `style={{\n                color: '#1a73e8',\n                textDecoration: 'none'\n              }}`, to: `className="linkify-link"` },
    { from: `style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}`, to: `className="text-break-word"` }
]);

// 8. ScreenRecorder.jsx
replaceInFile('frontend/src/components/common/ScreenRecorder.jsx', [
    { from: `style={{cursor: 'pointer', justifyContent: 'center'}}`, to: `className="cursor-pointer justify-center"` },
    { from: `className="screen-recorder-btn screen-recorder-btn-secondary" style={{background: 'var(--error-color)', borderColor: 'var(--error-dark)'}}`, to: `className="screen-recorder-btn screen-recorder-btn-secondary screen-recorder-btn-error"` }
]);

// 9. SmartImage.jsx
replaceInFile('frontend/src/components/common/SmartImage.jsx', [
    { from: `style={{\n          width: '100%',\n          height: '100%',\n          display: 'flex',\n          flexDirection: 'column',\n          alignItems: 'center',\n          justifyContent: 'center',\n          backgroundColor: 'var(--bg-secondary)',\n          color: 'var(--text-muted)'\n        }}`, to: `className="smart-image-placeholder"` },
    { from: `style={{ fontSize: '0.75rem', marginTop: '8px', fontWeight: 500 }}`, to: `className="smart-image-placeholder-text"` },
    { from: `style={{\n        opacity: isLoaded ? 1 : 0,\n        transition: 'opacity 0.3s ease',\n        display: 'block',\n        width: '100%',\n        height: '100%',\n        objectFit: 'cover',\n        ...style\n      }}`, to: `className={\`smart-image-img \${className || ''}\`} style={{ opacity: isLoaded ? 1 : 0, ...style }}` }
]);

console.log("Phase 3 complete.");
