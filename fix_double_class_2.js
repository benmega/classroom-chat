const fs = require('fs');

const files = [
    'frontend/src/components/admin/AdminModals.jsx',
    'frontend/src/components/profile/AchievementsList.jsx',
    'frontend/src/pages/Admin/AdminProjects.jsx',
    'frontend/src/pages/Admin/Users.jsx',
    'frontend/src/pages/General/CourseLevelBreakdown.jsx',
    'frontend/src/pages/General/CourseProgressTree.jsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        content = content.replace(/className="([^"]+)"([^>]*?)className="([^"]+)"/g, (match, class1, middle, class2) => {
            return `className="${class1} ${class2}"${middle}`;
        });

        fs.writeFileSync(file, content);
    }
});
console.log("Fixed double class names 2");
