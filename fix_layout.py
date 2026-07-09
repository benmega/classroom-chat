import re

with open('frontend/src/components/Layout/Layout.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix imports - keep HEAD, add Archive
content = re.sub(r'<<<<<<< HEAD\nimport { Menu, Package } from \'lucide-react\';\n=======\n.*?\n>>>>>>> origin/deploy', 'import { Menu, Package, Archive } from \'lucide-react\';', content, flags=re.DOTALL)

# Fix header structure - keep HEAD
content = re.sub(r'<<<<<<< HEAD\n(            <div className="main-layout-content">.*?)=======\n.*?\n>>>>>>> origin/deploy\n\n                        {isAuthenticated && !isParent && <UserSearch />}\n\n                        <nav>\n                            <ul>\n                                {isAuthenticated && user && user\.role !== \'parent\' && \(\n                                    <>\n                                        <li className="nav-stat-item">\n                                            <Link className="stat-badge ducks" to="/bit-shift" data-testid="nav-bit-shift">\n                                                <DuckIcon size={20} className="stat-icon" color="var\(--primary-color\)" />\n                                                <div className="stat-content">\n                                                    <span className="stat-label">Ducks</span>\n                                                    <span className="stat-value">\n                                                        {\(user\.duck_balance \?\? 0\)\.toLocaleString\(undefined, \{ \n                                                            minimumFractionDigits: 0, \n                                                            maximumFractionDigits: 3 \n                                                        \}\)}\n                                                    </span>\n                                                </div>\n                                            </Link>\n                                        </li>\n\n<<<<<<< HEAD', r'\1                        {isAuthenticated && !isParent && <UserSearch />}\n                        <nav>\n                            <ul>\n                                {isAuthenticated && user && user.role !== "parent" && (\n                                    <>\n                                        <li className="nav-stat-item">\n                                            <Link className="stat-badge ducks" to="/bit-shift" data-testid="nav-bit-shift">\n                                                <DuckIcon size={20} className="stat-icon" color="var(--primary-color)" />\n                                                <div className="stat-content">\n                                                    <span className="stat-label">Ducks</span>\n                                                    <span className="stat-value">\n                                                        {(user.duck_balance ?? 0).toLocaleString(undefined, { \n                                                            minimumFractionDigits: 0, \n                                                            maximumFractionDigits: 3 \n                                                        })}\n                                                    </span>\n                                                </div>\n                                            </Link>\n                                        </li>\n', content, flags=re.DOTALL)


# Fix dropdown conflict - combine HEAD and deploy (Drawer addition)
dropdown_replacement = r'''
                                        {Math.abs(user.packets) > 0.001 && (
                                            <li className="nav-stat-item">
                                                <Link className="stat-badge packets" to="/shop">
                                                    <Package size={20} className="stat-icon" />
                                                    <div className="stat-content">
                                                        <span className="stat-label">Packets</span>
                                                        <span className="stat-value" style={{ color: user.packets < 0 ? 'var(--error-color, #ff4444)' : 'inherit' }}>
                                                            {Number(user.packets || 0).toLocaleString(undefined, { 
                                                                minimumFractionDigits: 0, 
                                                                maximumFractionDigits: 3 
                                                            })}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </li>
                                        )}
                                    </>
                                )}

                                {isAuthenticated ? (
                                    <li className="profile-menu" ref={dropdownRef}>
                                        <button 
                                            className="profile-toggle" 
                                            onClick={(e) => {
                                                if (e.detail > 1) return;
                                                toggleDropdown();
                                            }}
                                            aria-haspopup="true" 
                                            aria-expanded={isDropdownOpen}
                                            title="Account"
                                            data-testid="profile-toggle"
                                        >
                                            <span className="profile-icon">
                                                <HamburgerIcon progress={user?.role === 'student' ? hamburgerProgress : 1} size={20} />
                                            </span>
                                        </button>
                                        <ul className={dropdown-menu }>
                                            {user?.role !== 'parent' && (
                                                <>
                                                {user.drawer && (
                                                    <li className="mobile-only-stat mobile-only">
                                                        <div className="dropdown-stat-link drawer" style={{ textDecoration: 'none' }}>
                                                            <Archive size={20} />
                                                            <div className="dropdown-stat-info">
                                                                <span className="dropdown-stat-label">Drawer</span>
                                                                <span className="dropdown-stat-value">{user.drawer}</span>
                                                            </div>
                                                        </div>
                                                    </li>
                                                )}
'''

content = re.sub(r'                                        \{Math\.abs\(user\.packets\) > 0\.001 && \(\n                                            <li className="nav-stat-item">.*?\n=======.*?\n                                                <>', dropdown_replacement, content, flags=re.DOTALL)

# Clean up trailing marker
content = re.sub(r'>>>>>>> origin/deploy\n', '', content)

with open('frontend/src/components/Layout/Layout.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Layout.jsx")
