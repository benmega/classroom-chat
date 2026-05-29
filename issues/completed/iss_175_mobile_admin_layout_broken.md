# Admin Panel Critically Broken on Mobile

## Description
When viewing the Admin Panel (`/admin`) or Advanced Admin Panel (`/admin/advanced`) on a mobile viewport, the main layout container is completely broken. The content area collapses to an extremely narrow width on the left side of the screen, clipping all text and interactive elements.

## Steps to Reproduce
1. Log into the application as an admin user.
2. Navigate to `/admin` or `/admin/advanced`.
3. View the page on a mobile-sized viewport (e.g., iPhone 13 Pro).

## Expected Result
The admin panels should be responsive, presenting navigation menus, tables, and settings in a scrollable, full-width mobile layout.

## Actual Result
The layout collapses. The main content is squished into a thin vertical strip on the left side of the screen (approx. 80px wide), cutting off all text (e.g., "Dash", "Ove", "Syste") and making the panel completely unusable on mobile.

## Impact
Critical - The admin interface is completely non-functional and broken on mobile devices, preventing any administrative actions.

## Screenshots
![Admin Panel Broken](c:\Users\Ben\AntiGravity\classroom-chat\issues\screenshots\mobile_admin.png)
![Admin Advanced Panel Broken](c:\Users\Ben\AntiGravity\classroom-chat\issues\screenshots\mobile_admin_advanced.png)

## Root Cause
Duplicate of iss_173. The .admin-main-wrapper had a max-width: calc(100% - var(--sidebar-width)) applied globally, compressing the admin panel on mobile widths.

## Changes Made
- Added max-width: 100% !important; to .admin-main-wrapper inside the mobile media query in rontend/src/components/Layout/AdminLayout.css.

## Fixed Screenshots
![Admin Panel Fixed](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_admin_fixed.png)
![Admin Advanced Fixed](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_admin_advanced_fixed.png)

