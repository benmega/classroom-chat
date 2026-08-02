# Parent Connect Child Page Missing Main Layout Header and Nav Rail

## Description
When navigating to the Connect Child route (`/parent/connect`), the component is rendered without the `<Layout>` wrapper in `App.jsx`. As a result, the global header, top branding logo, navigation rail (`ParentNavRail`), and user profile menu disappear completely, leaving the parent isolated on a bare card view with no standard navigation controls back to the Dashboard or Chat.

## Steps to Reproduce
1. Log in as a Parent user via `http://localhost:8000/dev-login?role=parent`.
2. Navigate directly to `http://localhost:5173/parent/connect` on Desktop viewport (1440x900).
3. Observe the viewport header and navigation rail areas.

## Expected Result
The `/parent/connect` page should be protected and wrapped in `<Layout>` (or `<ProtectedRoute parentOnly={true}><Layout><ConnectChild /></Layout></ProtectedRoute>`), providing consistent navigation headers and sidebars.

## Actual Result
The page renders without the main header or `ParentNavRail`, stranding the parent user without navigation links.

## Impact
Major - Impairs navigation user experience and breaks visual consistency across parent routes.

## Screenshots
![Parent Connect Child Missing Layout Header](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_217_parent_connect_desktop.png)
