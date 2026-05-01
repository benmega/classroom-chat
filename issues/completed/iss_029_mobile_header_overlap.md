# Bug: Mobile Header Stats Overlap

## Description
At mobile viewport widths (e.g., 500px), the "Ducks" and "Packets" stats badges in the global header overlap with each other and with the Profile toggle. This makes the stats unreadable and the profile menu difficult to access.

## Steps to Reproduce
1. Open the application.
2. Resize the browser window to 500px width.
3. Observe the header elements in the top right corner.

## Expected Result
Header elements should either stack vertically, hide less critical info, or move into a mobile menu to avoid overlap.

## Actual Result
Elements overlap and crowd the UI.

## Impact
**Major (UI/UX).** Poor user experience on mobile devices; critical information is obscured.

## Screenshots
![Mobile Header Overlap](C:\Users\Ben\.gemini\antigravity\brain\19dba842-3e02-4ebc-adb6-49c9486e16ba\mobile_chat_page_1775552296818.png)

## Verification Results
- **Date**: 2026-04-07
- **Test Case**: Resize browser to 500px width.
- **Result**: PASSED. 
  - Stats badges are hidden from the main header at 800px.
  - Stats (Ducks and Packets) are now properly formatted and displayed inside the Profile dropdown on mobile.
  - No overlap occurs in the header.
- **Verification Screenshot**: ![Fixed Mobile Header](C:\Users\Ben\.gemini\antigravity\brain\cebf9afe-4290-425d-bc0c-f0435d0d10c6\profile_dropdown_mobile_1775557088197.png)
