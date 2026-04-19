# [Medium] Header Search Bar Excessive Width on Large Viewports

## Description
The user search bar in the global header expands excessively on 1440px viewports, making the header look unbalanced and wasting significant horizontal space. It does not appear to have a `max-width` constraint appropriate for desktop layouts.

## Steps to Reproduce
1. Log in to the application.
2. View the header at a 1440px width.
3. Observe the search bar length.

## Expected Result
the search bar should have a reasonable `max-width` (e.g., 400px - 600px) and remain centered or appropriately aligned without dominating the header space.

## Actual Result
The search bar stretches to fill a large percentage of the header width, resulting in a "stretched" and unrefined appearance.

## Impact
Medium - Affects the premium aesthetic of the application on desktop.

## Screenshots
![Header Search Bar Stretched](file:///C:/Users/Ben/.gemini/antigravity/brain/f6577acb-c2e9-484a-867c-f71784390afc/chat_dashboard_main_1776012208061.png)
