# [Critical Security] Admin Panel Link Visible to Student Users

## Description
Student users can see and access the "Admin Panel" link in their profile dropdown menu. This represents a significant security vulnerability and a failure in role-based access control (RBAC) visibility.

## Steps to Reproduce
1. Log in as a student user (e.g., `blossomstudent01`).
2. Navigate to the main application interface.
3. Click on the profile icon in the top right header to open the dropdown menu.
4. Observe the menu items.

## Expected Result
Student users should only see links relevant to their role (Profile, Achievements, Logout, etc.). The "Admin Panel" link should be hidden for non-admin users.

## Actual Result
The "Admin Panel" link is visible and clickable in the student's profile dropdown menu.

## Impact
Critical - Information disclosure and potential unauthorized access to administrative features if backend lacks proper validation. It also breaks user trust and professional feel.

## Screenshots
![Admin Panel Link Visible to Student](file:///C:/Users/Ben/.gemini/antigravity/brain/f6577acb-c2e9-484a-867c-f71784390afc/.system_generated/click_feedback/click_feedback_1776012396207.png)
