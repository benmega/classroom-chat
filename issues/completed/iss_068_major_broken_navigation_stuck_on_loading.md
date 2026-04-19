# [Major] Multiple Student Pages Stuck in Loading State

## Description
Several navigation links in the student profile menu lead to pages that remain in a "Loading..." state indefinitely. These include Profile, History, and Bit Shift. This suggests either broken routes, missing frontend components, or backend API failures for these specific features.

## Steps to Reproduce
1. Log in as a student user (`blossomstudent01`).
2. Open the profile dropdown menu.
3. Click on "Profile", "History", or "Bit Shift".
4. Observe the resulting page.

## Expected Result
The corresponding feature pages should load their content.

## Actual Result
The application displays a loading spinner or "Loading..." text and stays on that screen indefinitely.

## Impact
Major - Entire features are inaccessible to student users, rendering those parts of the application non-functional.

## Screenshots
![Navigation Loading State](file:///C:/Users/Ben/.gemini/antigravity/brain/f6577acb-c2e9-484a-867c-f71784390afc/.system_generated/click_feedback/click_feedback_1776012396207.png)
