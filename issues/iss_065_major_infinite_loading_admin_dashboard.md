# [Major] Infinite Loading State on Admin Dashboard and User Directory

## Description
When navigating to the Admin Dashboard or the User Directory components, the interface remains in a "Loading..." state indefinitely or for an excessively long time, preventing administrators from managing the application.

## Steps to Reproduce
1. Log in as an admin user (`ben`).
2. Navigate to the Admin section.
3. Click on "Dashboard" or "Users" in the sidebar.
4. Observe the content area.

## Expected Result
The dashboard statistics or user list should load within 1-2 seconds.

## Actual Result
The screen shows "Loading Dashboard..." or "Loading User Directory..." and never progresses to show actual data, even after several seconds.

## Impact
Major - Prevents administrators from performing their core tasks (monitoring stats, managing users).

## Screenshots
![Admin Dashboard Infinite Loading](file:///C:/Users/Ben/.gemini/antigravity/brain/f6577acb-c2e9-484a-867c-f71784390afc/admin_dashboard_loaded_1776012272877.png)
