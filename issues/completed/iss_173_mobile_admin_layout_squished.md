# Admin Panel Layout Squished and Unusable on Mobile Viewports

## Description
When accessing the Admin Panel (`/admin` and `/admin/advanced`) on mobile viewport sizes (e.g., width 390px), the main content area is compressed into a tiny vertical strip on the left side of the screen, leaving the rest of the screen as empty white space. This makes the administrative dashboards and panels completely unreadable and unusable on mobile devices.

## Steps to Reproduce
1. Log in to the application as an administrator (e.g., using `dev-login?role=admin`).
2. Set the browser viewport width to mobile dimensions (e.g., 390px).
3. Navigate to `/admin` or `/admin/advanced`.
4. Observe the horizontal layout and compression of the main content column.

## Expected Result
On mobile viewports, the side navigation menu should hide (accessible via the hamburger toggle), and the main content area (`.admin-main-wrapper`) should span the full width (100%) of the screen.

## Actual Result
The main content area `.admin-main-wrapper` is constrained to a tiny fraction of the screen width (approximately 110px). This is because the CSS still applies `max-width: calc(100% - var(--sidebar-width))` on mobile viewports, where `var(--sidebar-width)` is `280px`, restricting the width to `390px - 280px = 110px`.

## Impact
Major - Admin dashboards, tables, and settings are completely unreadable and unusable on mobile viewports.

## Screenshots
![Admin Panel Layout Squished on Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_admin.png)
![Admin Advanced Panel Layout Squished on Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_admin_advanced.png)

## Root Cause
The .admin-main-wrapper had a max-width: calc(100% - var(--sidebar-width)) applied globally, which meant that even on mobile viewports where the sidebar is hidden/off-canvas, the main wrapper was constrained to 100% - 280px. This squished the admin content into a narrow vertical strip.

## Changes Made
- Added max-width: 100% !important; to .admin-main-wrapper inside the mobile media query in rontend/src/components/Layout/AdminLayout.css.

## Fixed Screenshots
![Admin Panel Fixed](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_admin_fixed.png)
![Admin Advanced Fixed](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_admin_advanced_fixed.png)

