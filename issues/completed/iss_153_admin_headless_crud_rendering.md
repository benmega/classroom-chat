---
id: iss_153
title: "Admin Headless CRUD: React-Admin Unmounts on Navigation Due to Layout Key Update"
status: "Open"
priority: "High"
category: "Frontend/Routing"
reporter: "UI/UX Audit Agent"
created_at: "2026-04-28"
---

# Issue Description
The "Admin Advanced Headless CRUD" interface is currently nonfunctional. When navigating to the Advanced CRUD section and attempting to interact with any of the resource tables (e.g., Users, Messages), the application fails to render the data grid. Instead, it displays a redundant vertical list of the resource names (the internal `react-admin` menu) in the main content area. Clicking on any of the resources results in no state change visually, leaving the tables inaccessible.

# Steps to Reproduce
1. Authenticate as an administrator and navigate to the `/admin` dashboard.
2. Open the "Advanced Panel" via the sidebar.
3. Click "Open Headless CRUD" under the Headless Database Management card.
4. Observe that the main view attempts to load but fails to render the default resource table (e.g., `Users`).
5. Attempt to click any resource from the list. Notice the URL updates (e.g., to `/admin/advanced-crud/User`), but the UI immediately resets and fails to show the selected data.

# Root Cause Analysis
The issue stems from a conflict between how `react-admin` manages its internal routing and how the application's overarching layout manages component lifecycles.

In `frontend/src/components/Layout/AdminLayout.jsx`, the main content wrapper is configured to force re-renders on route changes using the `location.pathname` as its React key:
```jsx
<main key={location.pathname} className="admin-body animate-page-entry">
    {children}
</main>
```
Because the Headless CRUD utilizes `react-admin`, which operates as a Single Page Application (SPA) with its own internal routing logic, every interaction inside the CRUD panel changes the global URL (e.g., changing from `/admin/advanced-crud` to `/admin/advanced-crud/User`). 

When this URL change bubbles up to the `AdminLayout`, the `location.pathname` updates, changing the `key` of the `<main>` element. This strictly instructs React to completely unmount and destroy the `<main>` node and all its children—including the entire `react-admin` instance. When it remounts, `react-admin` loses all contextual state and fails to render the target resource, effectively "rebooting" back to a broken base state.

# Proposed Solution
1. **Remove or Isolate the `key` Prop:** 
   Update `AdminLayout.jsx` to prevent the `<main>` element from unmounting when nested SPA routers change the path. You can remove `key={location.pathname}` entirely, or adjust the key to only change for top-level admin routes (ignoring sub-paths inside `/advanced-crud/*`).
   *Example Fix:*
   ```jsx
   // Instead of using the full path, use a generalized key or remove it
   const layoutKey = location.pathname.startsWith('/admin/advanced-crud') 
       ? '/admin/advanced-crud' 
       : location.pathname;
       
   <main key={layoutKey} className="admin-body animate-page-entry">
       {children}
   </main>
   ```
2. **Verify Data Provider (Optional but Recommended):**
   Once the layout remounting issue is resolved, verify that the `dataProvider.js` correctly parses the array payloads from the `crud_routes.py` backend. The current backend implementation correctly outputs `{"data": [...], "total": N}`, which aligns cleanly with the frontend configuration.

# Resolution
Implemented the proposed solution by updating the `key` prop on the `<main>` wrapper in `AdminLayout.jsx`. When navigating within the headless CRUD, the key remains static (`/admin/advanced-crud`), preventing React from unmounting and remounting the entire `react-admin` SPA. Navigation and rendering now perform as expected.

**Files Changed:**
- `frontend/src/components/layout/AdminLayout.jsx`
