# Issue: Chat View UI Polish Issues

## Status
- **ID**: iss_001
- **Severity**: Low
- **Type**: UI/UX Polish
- **Reporter**: Antigravity

## Description
The Chat view contains several minor UI polish issues that detract from the premium feel of the application:
1. **Placeholder Clipping**: The search input field for conversations is too narrow, resulting in the placeholder text "Search conversations..." being clipped to "Search conversatio...".
2. **Insufficient Padding**: The "Messages" header and the "New Conversation" (plus) icon are positioned too closely together, creating a cramped appearance.

## Steps to Reproduce
1. Log in as an admin.
2. Navigate to the Dashboard/Chat view (`/`).
3. Observe the sidebar on the left.

## Visual Evidence
![Clipped Placeholder and Tight Spacing](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/dashboard_view_1778391585206.png)

## Expected Behavior
- The search input should be wide enough to display the full placeholder text or the text should be adjusted.
- There should be consistent padding/margin between the "Messages" header and the "New Conversation" icon.

## Environment
- **Browser**: Chrome (via Playwright)
- **Resolution**: 1280x800 (Desktop)
