# Mobile History Alignment (Responsive Layout)

## Description
On the History page at mobile viewports (500px or less), the "Total Chats" and "Latest Activity" cards are not properly centered, appearing shifted to one side.

## Steps to Reproduce
1. Log in as any user.
2. Navigate to the History page via the profile dropdown.
3. Resize the browser to mobile width (500px).
4. Observe the activity summary cards.

## Expected Result
Cards should be centered or properly aligned within the page container on mobile.

## Actual Result
The cards are shifted, creating an unbalanced and non-premium visual appearance.

## Impact
Low/Medium - Affects the responsive quality of the History page.

## Screenshots
![Mobile History Alignment Issue](file:///C:/Users/Ben/.gemini/antigravity/brain/db89ad6d-60fe-430e-b42e-6b2adddc2ec4/.tempmediaStorage/media_db89ad6d-60fe-430e-b42e-6b2adddc2ec4_1775572045308.png)

## Verification Results
- **Action Taken**: Added `@media (max-width: 500px)` query inside `History.css` to set `grid-template-columns: 1fr` on `.history-stats`.
- **Outcome**: The cards now properly stack and naturally center on narrow mobile viewports, resolving the alignment issue.
- **Status**: Completed
