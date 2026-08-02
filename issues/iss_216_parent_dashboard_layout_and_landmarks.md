# Parent Dashboard Duplicate Main Landmark Tags and Layout Hierarchy Bug

## Description
On the Desktop viewport (1440x900), `ParentDashboard.jsx` renders a top-level `<main className="parent-body">` element inside `Layout.jsx`, which itself wraps page contents in `<main className="animate-page-entry">`. This creates duplicate nested `<main>` HTML5 landmark tags in the DOM tree, violating HTML5 semantic standards and WCAG accessibility rules, and causing layout locator conflicts during automated testing.

## Steps to Reproduce
1. Log in as a Parent user via `http://localhost:8000/dev-login?role=parent`.
2. Navigate to `http://localhost:5173/parent/dashboard` on a desktop viewport (1440x900).
3. Inspect the DOM elements for the page root.
4. Observe two `<main>` tags nested directly within each other (`<main>` containing `<main className="parent-body">`).

## Expected Result
The page should contain exactly one `<main>` landmark element at the layout level to ensure semantic HTML structure and accessibility compliance.

## Actual Result
Two nested `<main>` tags are rendered, triggering browser accessibility errors (`Some page content is not contained by landmarks` / duplicate landmark violation).

## Impact
Medium - Degrades accessibility compliance (WCAG 2.1 landmark hierarchy) and causes DOM layout hierarchy conflicts.

## Screenshots
![Parent Dashboard Desktop Layout](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_216_parent_dashboard_desktop.png)
