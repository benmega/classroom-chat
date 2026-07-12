const fs = require('fs');

const files = [
    'frontend/src/components/admin/AdminModals.jsx',
    'frontend/src/components/profile/AchievementsList.jsx',
    'frontend/src/pages/Admin/AdminProjects.jsx',
    'frontend/src/pages/Admin/AdminUserDashboard.jsx',
    'frontend/src/pages/Admin/AdvancedPanel.jsx',
    'frontend/src/pages/Admin/Classes.jsx',
    'frontend/src/pages/Admin/DuckTransactions.jsx',
    'frontend/src/pages/Admin/PendingTrades.jsx',
    'frontend/src/pages/Admin/Users.jsx',
    'frontend/src/pages/Auth/ForgotPassword.jsx',
    'frontend/src/pages/Auth/ResetPassword.jsx',
    'frontend/src/pages/Auth/Signup.jsx',
    'frontend/src/pages/Chat/Chat.jsx',
    'frontend/src/pages/General/CourseLevelBreakdown.jsx',
    'frontend/src/pages/General/CourseProgressTree.jsx',
    'frontend/src/pages/General/History.jsx',
    'frontend/src/pages/General/LandingDesktop.jsx',
    'frontend/src/pages/General/LandingMobile.jsx',
    'frontend/src/pages/General/SubmitChallenge.jsx',
    'frontend/src/pages/Parent/ParentDashboard.jsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        // className="A" className="B"
        content = content.replace(/className="([^"]+)"\s+className="([^"]+)"/g, 'className="$1 $2"');
        
        // className={`A`} className="B"
        content = content.replace(/className=\{`([^`]+)`\}\s+className="([^"]+)"/g, 'className={`$1 $2`}');
        
        // className="A" className={`B`}
        content = content.replace(/className="([^"]+)"\s+className=\{`([^`]+)`\}/g, 'className={`$1 $2`}');

        fs.writeFileSync(file, content);
    }
});
console.log("Fixed double class names");
