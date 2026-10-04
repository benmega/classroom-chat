const fs = require('fs');

const files = [
    'frontend/src/App.jsx',
    'frontend/src/App.test.jsx',
    'frontend/src/admin/AdminPanel.jsx',
    'frontend/src/components/admin/AdminPageHeader.jsx',
    'frontend/src/components/admin/GameRewardsCsvModal.test.jsx',
    'frontend/src/components/chat/MultiSelectDropdown.jsx',
    'frontend/src/components/chat/SandboxArcadeModal.jsx',
    'frontend/src/components/common/DesktopNotice.jsx',
    'frontend/src/components/common/HamburgerIcon.jsx',
    'frontend/src/components/common/ImageUpload.jsx',
    'frontend/src/components/common/Linkify.jsx',
    'frontend/src/components/common/Modal.jsx',
    'frontend/src/components/common/ScreenRecorder.jsx',
    'frontend/src/components/common/SmartImage.jsx',
    'frontend/src/components/common/SubmitProgressModal.jsx',
    'frontend/src/components/common/Tutorial.jsx',
    'frontend/src/components/common/UserSearchInput.jsx',
    'frontend/src/components/Layout/AdminLayout.jsx',
    'frontend/src/components/Layout/Layout.jsx',
    'frontend/src/components/Layout/Layout.test.jsx',
    'frontend/src/components/Layout/MobileSidebar.jsx',
    'frontend/src/components/Layout/MobileSidebar.test.jsx',
    'frontend/src/components/profile/CameraModal.jsx',
    'frontend/src/components/profile/CourseProgress.jsx',
    'frontend/src/components/profile/CourseProgress.test.jsx',
    'frontend/src/components/profile/DigitalNotebook.jsx',
    'frontend/src/components/profile/ProjectPortfolio.test.jsx',
    'frontend/src/hooks/useChatSocket.test.jsx',
    'frontend/src/hooks/useSidebar.test.jsx',
    'frontend/src/hooks/useUsersManagement.test.jsx',
    'frontend/src/pages/Admin/AdminAssignProject.jsx',
    'frontend/src/pages/Admin/AdminAssignProject.test.jsx',
    'frontend/src/pages/Admin/AdminChallenges.jsx'
];

files.forEach(f => {
    try {
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
            if (line.includes('//') || line.includes('/*')) {
                console.log(`${f}:${i+1}:${line}`);
            }
        });
    } catch (e) {
        console.error(e);
    }
});
