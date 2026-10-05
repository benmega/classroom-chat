/**
 * Contract tests for the stylesheets touched by the CSS clean-up (issue #78).
 *
 * happy-dom does not run the cascade, so a component test cannot tell whether a rule still wins. These tests
 * assert on the stylesheet source instead: the files stay free of !important and of raw colour literals, the
 * specificity-raising selectors that replaced the !important flags are still there, and the focus rules keep a
 * transparent outline for forced-colors mode. The rendered result was checked by diffing computed styles.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const readCss = (rel) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

/** Every `selectors { body }` pair, with the selector list normalised to single spaces. */
function rules(css) {
    const out = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let match;
    while ((match = re.exec(css)) !== null) {
        out.push({
            // a comma inside parentheses (:where(.a, .b)) does not end a selector
            selectors: match[1].split(/,(?![^(]*\))/).map((s) => s.trim().replace(/\s+/g, ' ')),
            body: match[2],
        });
    }
    return out;
}

/** Concatenated bodies of every rule that lists `selector`. */
function bodyOf(css, selector) {
    return rules(css)
        .filter((r) => r.selectors.includes(selector))
        .map((r) => r.body)
        .join('\n');
}

/**
 * Every hex or `white` literal a rule writes outside var() (a var() fallback is dead while its token is defined),
 * gradients included. Custom property definitions (--name: #hex) are tokens, not uses.
 */
function rawColours(rel) {
    const found = [];
    for (const { body } of rules(readCss(rel))) {
        for (const decl of body.split(';')) {
            const [prop, ...rest] = decl.split(':');
            if (!rest.length || prop.trim().startsWith('--')) continue;
            let value = rest.join(':');
            for (let previous = null; previous !== value;) {
                previous = value;
                value = value.replace(/var\([^()]*\)/g, '');
            }
            const literals = value.match(/#[0-9a-fA-F]{3,8}\b|(?<![\w-])white(?![\w-])/g) || [];
            for (const literal of literals) found.push(`${prop.trim()}: ${literal.toLowerCase()}`);
        }
    }
    return found;
}

const countImportant = (rel) => (readCss(rel).match(/!important/g) || []).length;

/** Colour literals used as plain declaration values (var() fallbacks and gradients are not literals here). */
function colourLiterals(rel) {
    const found = [];
    for (const { body } of rules(readCss(rel))) {
        for (const decl of body.split(';')) {
            const [prop, ...rest] = decl.split(':');
            const value = rest.join(':').trim();
            if (!value || /var\(|gradient\(|rgba?\(/.test(value)) continue;
            const hex = value.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
            const white = /(^|\s)white(\s|$)/.test(value) ? ['white'] : [];
            for (const literal of [...hex, ...white]) found.push(`${prop.trim()}: ${literal.toLowerCase()}`);
        }
    }
    return found;
}

describe('!important removal', () => {
    it.each([
        'pages/General/BitShift.css',
        'pages/Auth/Auth.css',
        'pages/Profile/Profile.css',
        'pages/Chat/Chat.css',
        'pages/User/ManageProject.css',
    ])('%s has no !important left', (rel) => {
        expect(countImportant(rel)).toBe(0);
    });

    it('BitShift raises specificity instead of using !important', () => {
        const css = readCss('pages/General/BitShift.css');
        expect(bodyOf(css, '.bit-shift-page .input-combined-container .digital-ducks-input')).toMatch(/border:\s*none/);
        expect(bodyOf(css, '.math-check-equation .binary-value')).toMatch(/font-family:/);
        expect(bodyOf(css, '.bit-shift-page .submit-button')).toMatch(/padding:\s*1rem/);
    });

    it('Auth inputs and buttons are scoped under .auth-container, and the dead .cognito-btn rules are gone', () => {
        const css = readCss('pages/Auth/Auth.css');
        expect(bodyOf(css, '.auth-container .auth-input')).toMatch(/padding:/);
        expect(bodyOf(css, '.auth-container .auth-input:hover:not(:focus)')).toMatch(/border-color:/);
        expect(bodyOf(css, '.auth-container .auth-input:focus')).toMatch(/border-color:/);
        expect(bodyOf(css, '.auth-container .auth-button')).toMatch(/padding:/);
        expect(css).not.toContain('cognito-btn');
    });

    it('the crop modal wins over .modal-content on specificity', () => {
        const css = readCss('pages/Profile/Profile.css');
        expect(bodyOf(css, '.modal-content.crop-modal-content')).toMatch(/max-width:\s*500px/);
    });
});

describe('Auth page blobs (T4c)', () => {
    it('clips the oversized background blobs so the page cannot scroll sideways', () => {
        const css = readCss('pages/Auth/Auth.css');
        expect(bodyOf(css, '.auth-bg-decoration')).toMatch(/overflow:\s*hidden/);
    });
});

describe('focus indicators (T6c)', () => {
    it('keeps a transparent outline on focused form controls instead of removing it', () => {
        const css = readCss('index.css');
        const body = bodyOf(css, 'input:focus');
        expect(body).toMatch(/outline:\s*2px solid transparent/);
        expect(body).not.toMatch(/outline:\s*none/);
        expect(body).toMatch(/box-shadow:\s*var\(--focus-ring\)/);
    });

    it.each([
        'index.css',
        'pages/User/ManageProject.css',
        'pages/User/EditProfile.css',
        'pages/Parent/AddChildModal.css',
        'pages/General/BitShift.css',
    ])('%s has no :focus rule that removes the outline', (rel) => {
        const offenders = rules(readCss(rel))
            .filter((r) => r.selectors.some((s) => s.includes(':focus')) && /outline:\s*none/.test(r.body))
            .map((r) => r.selectors.join(', '));
        expect(offenders).toEqual([]);
    });

    it('gives the BitShift input container a forced-colors outline while its input is focused', () => {
        const css = readCss('pages/General/BitShift.css');
        expect(bodyOf(css, '.input-combined-container:focus-within')).toMatch(/outline:\s*2px solid transparent/);
    });

    // These used to set outline: none and show only a border-colour change or a faint tinted glow (--shadow-glow is
    // none). They now draw the same two-tone ring as every other input, plus the transparent outline for forced colours.
    it.each([
        ['pages/General/History.css', ':where(.history-page) .search-bar input:focus'],
        ['pages/General/Achievements.css', '.search-box input:focus'],
        ['pages/Parent/ParentDashboard.css', '.connect-input:focus'],
        ['pages/General/JoinClassroom.css', '.join-code-input:focus'],
        ['components/common/SubmitProgressModal.css', '.submit-progress-control:focus'],
        ['components/common/UserSearchInput.css', '.search-input-wrapper-common:focus-within'],
        ['pages/General/BitShift.css', '.input-combined-container:focus-within'],
    ])('%s: %s draws the shared focus ring', (rel, selector) => {
        const body = bodyOf(readCss(rel), selector);
        expect(body).toMatch(/box-shadow:\s*var\(--focus-ring\)/);
        expect(body).toMatch(/outline:\s*2px solid transparent/);
        expect(body).toMatch(/border-color:\s*var\(--primary-accessible\)/);
    });

    it('leaves outline: none only where something else shows the focus', () => {
        const files = fs.readdirSync(SRC, { recursive: true })
            .map((f) => f.split(path.sep).join('/'))
            .filter((f) => f.endsWith('.css') && !/^(pages\/Admin|components\/admin)\//.test(f));
        const found = [];
        for (const rel of files) {
            for (const r of rules(readCss(rel))) {
                if (/outline:\s*none/.test(r.body)) found.push(`${rel}: ${r.selectors.join(', ')}`);
            }
        }
        expect(found.sort()).toEqual([
            // the pill around it carries the focus ring
            'components/common/UserSearchInput.css: .user-search-input-common',
            // a stylesheet no component imports
            'components/common/ConfirmDialog.css: .confirm-dialog',
            // a disabled field, never focusable
            'pages/User/EditProfile.css: .connection-code-value',
            // the container around it carries the focus ring
            'pages/General/BitShift.css: .bit-shift-page .input-combined-container .digital-ducks-input',
        ].sort());
    });
});

describe('react-admin layout rules (T6d)', () => {
    it('no longer lives in the global stylesheet', () => {
        expect(readCss('index.css')).not.toMatch(/\.Ra[A-Z]/);
    });

    it('is scoped to the admin panel layout', () => {
        const css = readCss('admin/AdminPanel.css');
        expect(bodyOf(css, '.admin-crud-layout .RaLayout-appFrame')).toMatch(/min-width:\s*0/);
        expect(css).not.toContain('!important');
    });
});

describe('colour tokens (T3a)', () => {
    const vars = readCss('assets/css/variables.css');
    const tokenValue = (name) => (vars.match(new RegExp(`${name}:\\s*([^;]+);`)) || [])[1]?.trim();

    it('defines the tokens that replaced raw literals with the literals\' exact values', () => {
        expect(tokenValue('--text-on-primary')).toBe('#FFFFFF');
        expect(tokenValue('--graph-level-1')).toBe('#BAE6FD');
        expect(tokenValue('--graph-level-2')).toBe('#7DD3FC');
        expect(tokenValue('--graph-level-3')).toBe('#38BDF8');
        expect(tokenValue('--graph-level-4')).toBe('#0284C7');
        expect(tokenValue('--green-50')).toBe('#F0FDF4');
        expect(tokenValue('--green-100')).toBe('#DCFCE7');
        expect(tokenValue('--green-800')).toBe('#166534');
        expect(tokenValue('--amber-700')).toBe('#B45309');
        expect(tokenValue('--amber-400')).toBe('#FBBF24');
        expect(tokenValue('--amber-500')).toBe('#F59E0B');
        expect(tokenValue('--amber-800')).toBe('#92400E');
        expect(tokenValue('--indigo-400')).toBe('#818CF8');
        expect(tokenValue('--indigo-500')).toBe('#6366F1');
        expect(tokenValue('--red-700')).toBe('#B91C1C');
        expect(tokenValue('--red-900')).toBe('#7F1D1D');
        expect(tokenValue('--gray-400')).toBe('#9CA3AF');
        expect(tokenValue('--success-subtle')).toBe('#E6F4EA');
        expect(tokenValue('--codecombat-color')).toBe('#2B91AF');
        expect(tokenValue('--ozaria-color')).toBe('#902EDB');
        expect(tokenValue('--settings-tint')).toBe('#EDF7F6');
        expect(tokenValue('--settings-border')).toBe('#A4CFC9');
        expect(tokenValue('--settings-code-bg')).toBe('#D2E7E6');
        expect(tokenValue('--settings-accent')).toBe('#2D8B83');
        expect(tokenValue('--settings-accent-hover')).toBe('#25746D');
        expect(tokenValue('--primary-darker')).toBe('#00666D');
        expect(tokenValue('--gold')).toBe('#FFD700');
        expect(tokenValue('--silver')).toBe('#B0C4DE');
        expect(tokenValue('--bronze')).toBe('#CD7F32');
        expect(tokenValue('--duck-beak')).toBe('#FF9900');
        expect(tokenValue('--duck-eye')).toBe('#1A1A1A');
        expect(tokenValue('--duck-label')).toBe('#78350F');
        expect(tokenValue('--video-backdrop')).toBe('#000000');
    });

    it('keeps no white keyword or hex literal in the Achievements page styles', () => {
        expect(colourLiterals('pages/General/Achievements.css')).toEqual([]);
    });

    it('keeps no raw hex or white literal in the BitShift and Profile styles', () => {
        expect(colourLiterals('pages/General/BitShift.css')).toEqual([]);
        expect(colourLiterals('pages/Profile/Profile.css')).toEqual([]);
    });

    it('keeps raw hex and white literals out of every non-admin stylesheet', () => {
        const files = fs.readdirSync(SRC, { recursive: true })
            .map((f) => f.split(path.sep).join('/'))
            .filter((f) => f.endsWith('.css'))
            // variables.css is where the literals live; the admin styles are covered by their own tests
            .filter((f) => f !== 'assets/css/variables.css' && f !== 'components/Layout/AdminLayout.css')
            .filter((f) => !/^(pages\/Admin|components\/admin)\//.test(f));
        const found = files.flatMap((rel) => rawColours(rel).map((literal) => `${rel}: ${literal}`));
        // Layout.css still holds the rule of the removed locker drawer; nothing renders .stat-badge.drawer
        const leftovers = ['components/Layout/Layout.css: color: #6366f1'];
        expect(found.filter((literal) => !leftovers.includes(literal))).toEqual([]);
    });
});

describe('shared class names (T1a)', () => {
    const allCss = () => fs.readdirSync(SRC, { recursive: true })
        .map((f) => f.split(path.sep).join('/'))
        .filter((f) => f.endsWith('.css'));
    // The admin stylesheets are covered by their own lane; AdminLayout.css only styles the admin shell
    const isAdmin = (rel) => /^(pages\/Admin|components\/admin)\//.test(rel) || rel === 'components/Layout/AdminLayout.css';

    /** The class a selector starts with: `.a .b` defines .a for the whole app, `:where(.root) .b` defines nothing. */
    function leadingClasses(rel) {
        const found = new Set();
        for (const { selectors } of rules(readCss(rel))) {
            for (const selector of selectors) {
                const match = selector.match(/^\.([A-Za-z_][\w-]*)/);
                if (match) found.add(match[1]);
            }
        }
        return found;
    }

    function definers(files) {
        const owners = {};
        for (const rel of files) for (const cls of leadingClasses(rel)) (owners[cls] ??= []).push(rel);
        return owners;
    }

    it('keeps every class a page stylesheet defines out of the other stylesheets', () => {
        const owners = definers(allCss().filter((rel) => !isAdmin(rel)));
        const shared = Object.keys(owners).filter((cls) => owners[cls].length > 1).sort();
        expect(shared).toEqual([
            // print rules that reset the layout containers on purpose
            'app-container',
            'desktop-nav-rail',
            'main-layout-content',
            // the same navigation component, split over three files (no markup uses it any more)
            'profile-toggle',
        ]);
    });

    it('lets only the shared base stylesheets define a class an admin stylesheet also defines', () => {
        const shared = new Set([
            'index.css',
            'components/common/Modal.css', // .form-group is global on purpose, with the modal shell classes
            'components/common/Skeleton.css',
            'assets/css/sprite.css',
        ]);
        const adminOwned = definers(allCss().filter(isAdmin));
        const offenders = [];
        for (const rel of allCss().filter((f) => !isAdmin(f) && !shared.has(f))) {
            for (const cls of leadingClasses(rel)) {
                if (adminOwned[cls]) offenders.push(`${rel}: .${cls}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    // A selector that starts with :where(.root) keeps the specificity of the bare class it replaced, so the page
    // keeps winning against the shared base styles exactly as before, but no longer reaches other pages.
    it.each([
        ['pages/Profile/Profile.css', ['profile-page', 'report-card-page'], ['pages/Profile/index.jsx', 'pages/Parent/ParentReportCard.jsx'], 'dashboard-panel'],
        ['pages/User/EditProfile.css', ['edit-profile-page'], ['pages/User/EditProfile.jsx'], 'form-control'],
        ['pages/User/ManageProject.css', ['manage-project-page'], ['pages/User/ManageProject.jsx', 'pages/Admin/AdminAssignProject.jsx'], 'form-group'],
        ['pages/Parent/ConnectChild.css', ['connect-child-page'], ['pages/Parent/ConnectChild.jsx', 'pages/General/JoinClassroomLink.jsx'], 'btn-primary'],
        ['pages/Parent/ParentDashboard.css', ['parent-dashboard'], ['pages/Parent/ParentDashboard.jsx'], 'activity-dot'],
        ['pages/General/Achievements.css', ['achievements-page'], ['pages/General/Achievements.jsx'], 'badge-wrapper'],
        ['pages/General/Activity.css', ['activity-page'], ['pages/General/Activity.jsx'], 'status-pill'],
        ['pages/General/ProjectInfo.css', ['project-info-page'], ['pages/General/ProjectInfo.jsx'], 'info-label'],
        ['pages/General/CourseProgressTree.css', ['course-progress-page', 'course-progress-container'], ['pages/General/CourseProgressTree.jsx', 'pages/General/CourseLevelBreakdown.jsx'], 'gap-md'],
        ['pages/Auth/Auth.css', ['auth-page'], ['pages/Auth/Login.jsx', 'pages/Auth/Signup.jsx', 'pages/Auth/ForgotPassword.jsx', 'pages/Auth/ResetPassword.jsx'], 'input-icon'],
        ['components/common/ImageUpload.css', ['image-upload-wrapper'], ['components/common/ImageUpload.jsx'], 'progress-bar-fill'],
        ['components/common/SubmitProgressModal.css', ['submit-challenge-popover'], ['components/common/SubmitProgressModal.jsx'], 'spinner'],
        ['components/common/UserSearchInput.css', ['user-search-common-container'], ['components/common/UserSearchInput.jsx'], 'status-indicator'],
    ])('%s scopes its shared class names under a root its markup renders', (rel, roots, jsxFiles, sample) => {
        expect(bodyOf(readCss(rel), `:where(${roots.map((r) => `.${r}`).join(', ')}) .${sample}`)).not.toBe('');
        const markup = jsxFiles.map((f) => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
        for (const root of roots) expect(markup).toMatch(new RegExp(`["'\`\\s]${root}["'\`\\s]`));
    });

    it('renames the classes of the portalled and unmounted modals instead of scoping them', () => {
        const profile = readCss('pages/Profile/Profile.css');
        expect(bodyOf(profile, '.profile-modal-footer')).not.toBe('');
        expect(bodyOf(profile, '.profile-modal-actions')).not.toBe('');
        expect(rules(profile).some((r) => r.selectors.includes('.profile-modal-overlay'))).toBe(true);
        expect(profile).not.toMatch(/\.modal-(overlay|footer|actions)\b/);
        const addChild = readCss('pages/Parent/AddChildModal.css');
        expect(addChild).not.toMatch(/\.(modal-overlay|modal-header|modal-body|close-btn|form-group|error-message)\b/);
        expect(readCss('components/common/SubmitProgressModal.css')).not.toMatch(/\.form-control\b/);
        const denied = readCss('pages/Error/AccessDenied.css');
        expect(bodyOf(denied, '.access-denied-page')).toMatch(/min-height/);
        expect(denied).not.toMatch(/\.access-denied-(container|card)\b/);
    });

    it('no longer carries the rules nothing renders, which used to restyle other pages', () => {
        expect(fs.existsSync(path.join(SRC, 'pages/General/SubmitCertificate.css'))).toBe(false);
        expect(readCss('pages/General/Landing.css')).not.toMatch(/\.section-title\b/);
        expect(readCss('pages/Parent/ParentDashboard.css')).not.toMatch(/\.section-title\b|\.activity-item\b/);
        expect(readCss('pages/General/CourseProgressTree.css')).not.toMatch(/\.modal-(card|header|actions|backdrop)\b/);
        expect(readCss('pages/General/ProjectInfo.css')).not.toMatch(/\.status-badge\b/);
        expect(readCss('pages/General/StudentParentCode.css')).not.toMatch(/\.refresh-btn\b/);
        expect(readCss('components/common/SubmitProgressModal.css')).not.toMatch(/\.(form-title|submit-button)\b/);
        expect(readCss('index.css')).not.toMatch(/\.danger-zone-desc\b/);
    });

    it('keeps the header stat rules from reaching the same class names elsewhere', () => {
        const layout = readCss('components/Layout/Layout.css');
        // the header badge already hides its label and sizes its value through .stat-badge; the bare rules in the
        // narrow-screen block used to hide every .stat-label and shrink every .stat-value in the app
        expect(rules(layout).filter((r) => r.selectors.some((s) => /^\.(stat-label|stat-value|user-info)$/.test(s)))).toEqual([]);
        expect(bodyOf(layout, '.stat-badge .stat-label')).toMatch(/display:\s*none/);
    });
});
