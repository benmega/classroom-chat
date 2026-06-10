---
description: Systematically identify and resolve technical debt, bad code smells, and inconsistencies.
---

# Cleanup Tech Debt Workflow

This workflow focuses on improving code quality, maintainability, and architectural consistency without necessarily changing functionality.

1.  **Discovery**:
    -   Identify files that are "bloated" (e.g., > 250 lines for a component).
    -   Search for hardcoded values (colors, API endpoints, strings) using `grep_search`.
    -   Look for redundant styles or logic across multiple components.
    -   Identify "TODO" or "FIXME" comments in the codebase.

2.  **Smell Identification**:
    -   **Magic Numbers/Strings**: Replace hardcoded values with named constants or CSS variables.
    -   **Prop Drilling**: Identify deeply nested components that could benefit from Context or State Management.
    -   **Component Splitting**: Break down large components into smaller, reusable pieces.
    -   **Styling Inconsistency**: Convert inline styles to CSS modules or standardized global classes.
    -   **Missing Error Handling**: Add `try-catch` blocks or descriptive error messages to asynchronous operations.

3.  **Refactoring Pattern**:
    -   **Architecture Consistency**: Ensure all refactors align with the patterns defined in [frontend_design.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/frontend_design.md) and [backend_design.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/backend_design.md).
    -   **Constants**: Move shared strings and configurations to `src/constants/` or `config/`.
    -   **Utils/Hooks**: Extract logic that is used in more than one place into a custom hook or utility function.
    -   **Styling**: Ensure all colors and spacing use the CSS variables defined in `index.css`.
    -   **Personality Preservation**: DO NOT formalize casual language or remove fun features. Always refer to [PERSONALITY_GUIDE.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/PERSONALITY_GUIDE.md) to ensure the whimsical tone is preserved.
    -   **Code Cleanliness**: Remove unused imports, console logs (unless for debugging), and dead code.

4.  **Execution**:
    -   Apply changes using `multi_replace_file_content` to maintain atomicity of the refactor.
    -   If a refactor is high-risk (e.g., changing a central utility), apply it in small, incremental steps.

5.  **Verification**:
    -   Monitor `npm run dev` and `python main.py` output for immediate errors.
    -   **UI Validation**: Use the `browser_subagent` to verify that the UI still looks and behaves as expected.
    -   **Stability Note**: If the subagent fails with a CDP/Page ID error, do not assume the refactor broke the app; first verify the dev server is still running and the browser instance is responsive.
    -   **Manual Check**: If the refactor involves data flow, login and perform a manual check of the affected feature.

6.  **Reporting**:
    -   Document exactly what was cleaned (e.g., "Extracted 3 sub-components from Dashboard.jsx", "Standardized button colors").
    -   Highlight any remaining "deep" technical debt that was too complex for a single pass.
