const fs = require('fs');
let content = fs.readFileSync('src/components/common/Tutorial.jsx', 'utf8');

const closeFn = `  const handleClose = useCallback(() => {
    if (user && !user.has_seen_tutorial) {
      completeTutorial();
    }
    setIsOpen(false);
  }, [user, completeTutorial]);
`;

content = content.replace(/  const handleClose = \(\) => \{\n    if \(user && !user\.has_seen_tutorial\) \{\n      completeTutorial\(\);\n    \}\n    setIsOpen\(false\);\n  \};\n/, '');

content = content.replace('  useLayoutEffect(() => {', closeFn + '\n  useLayoutEffect(() => {');

if (!content.includes('useCallback')) {
    content = content.replace(/import React, \{ /, 'import React, { useCallback, ');
}

fs.writeFileSync('src/components/common/Tutorial.jsx', content);
