---
id: iss_223
title: Admin Panel Sidebar Routing Mismatch
module: frontend
status: open
severity: high
type: bug
---

# Description
When navigating through the Admin Panel via the sidebar, the routes are incorrectly mapped to the wrong components, causing an off-by-one rendering error.

# Steps to Reproduce
1. Log in as an admin and navigate to the Admin Dashboard.
2. Click on "Items To Review" in the sidebar. The URL changes to `/admin/to-review` but the page displays the "Overview Dashboard" content.
3. Click on "User Management". The URL changes to `/admin/users` but the page displays the "To Review" content.
4. Click on "Classes & Enrolments". The URL changes to `/admin/classes` but the main content area is entirely blank.

# Expected Behavior
Each sidebar link should render the correct component that corresponds to its route.

# Actual Behavior
Routes are misaligned with their corresponding UI components, rendering the wrong view for each admin page.
