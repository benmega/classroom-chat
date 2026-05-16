# ISSUE: Frontend Linting Violations

## Status
- **Priority**: Medium
- **Category**: Tech Debt / Linting
- **Assignee**: Frontend Developer
- **Resolution**: Fixed

## Description
The frontend codebase had 58 ESLint violations, including unused variables, undefined references, and incorrect React hook usage.

## Root Cause
- Accumulated technical debt from rapid development.
- Incomplete refactors where imports or variables were left behind.
- Missing configuration for environment-specific globals (Node, Jest, Vitest) in `eslint.config.js`.
- Incorrect React hook patterns (synchronous state updates in `useEffect`).

## Resolution Details
- **ESLint Configuration**: Updated `eslint.config.js` to include globals for `node`, `jest`, and `vitest`. Added `argsIgnorePattern: '^_'` to allow unused arguments prefixed with an underscore.
- **Unused Variables**: Removed dozens of unused imports and variables across the codebase, including in `main.js`, `profile.js`, `Analytics.jsx`, `PendingTrades.jsx`, and `Achievements.jsx`.
- **Undefined References**: Fixed `no-undef` errors in `socketLogic.js` (removed invalid `sendMessage` call), `duck-stats.js` (assigned `Chart` instance), and `duck_trade.js` (explicitly used `window.fetchAchievements`).
- **React Hook Stability**: 
    - In `useChatSocket.js`, initialized `isConnected` with current socket status and removed redundant sync updates.
    - In `Tutorial.jsx`, wrapped `setState` in `requestAnimationFrame` to avoid synchronous updates during rendering.
    - In `useUsersManagement.js`, wrapped `fetchUsers` in `useCallback` to stabilize dependencies.
- **RegEx Optimization**: Removed unnecessary escapes in `ProjectModal.jsx`.

## Verification Results
- **Linting**: `npm run lint` now passes with zero errors and warnings.
- **Functional**: Verified that the application loads correctly at `http://localhost:5173`.

## Changed Files
- `frontend/eslint.config.js`
- `frontend/static/js/main.js`
- `frontend/static/js/sockets/socketLogic.js`
- `frontend/static/js/users/profile.js`
- `frontend/tests-e2e/auth.spec.js`
- `frontend/src/hooks/useChatSocket.js`
- `frontend/src/components/common/Tutorial.jsx`
- `frontend/src/admin/dataProvider.js`
- `frontend/src/components/profile/ProjectModal.jsx`
- `frontend/src/hooks/useProjectManagement.js`
- `frontend/src/pages/Admin/AdvancedPanel.jsx`
- `frontend/src/pages/Admin/Analytics.jsx`
- `frontend/src/pages/Admin/PendingTrades.jsx`
- `frontend/src/pages/General/Achievements.jsx`
- `frontend/src/store/useAuthStore.js`
- `frontend/src/store/useAuthStore.test.js`
- `frontend/src/utils/video.js`
- `frontend/static/js/achievements/achievements.js`
- `frontend/static/js/admin/duck-stats.js`
- `frontend/static/js/ducks/duck_trade.js`
- `frontend/src/context/SidebarContext.jsx`
- `frontend/src/hooks/useUsersManagement.js`
