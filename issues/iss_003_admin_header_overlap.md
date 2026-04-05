# ISSUE-003: Admin Dashboard Header Overlap

## Status: Open
## Priority: Low
## Category: UI / Layout

### Description
On the Admin Dashboard page, the page title ("Admin Dashboard") overlaps with the user profile icon/dropdown in the top-right header area. This indicates a responsive layout or z-index issue in the Admin layout.

### Steps to Reproduce
1. Log in as an administrator.
2. Navigate to `/admin`.
3. Observe the header area where the title and profile icon are located.

### Expected Behavior
The title should be centered or left-aligned with sufficient padding from the right-side actions/profile menus.

### Actual Behavior
The title text literally sits on top of or under the profile icon.
