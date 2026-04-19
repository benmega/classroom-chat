# Edit Fields Expansion (Description & Comments)

## Description
The text areas for project description and teacher comments in the editing page are too small.

## Details
- Users want to write more substantial text and need a taller/expandable field.
- Affects both the Project Description field and the Teacher Comment field.

## Recommended Solution
1. Convert the standard input/textarea to an auto-expanding textarea.
2. Increase the default `rows` or `min-height` for these specific fields.

## Impact
Low - UX improvement to facilitate better content entry.

## Root Cause
The textareas used for project description and teacher comments had fixed `rows` attributes (4 and 2 respectively) and no dynamic height adjustment, making it difficult for users to view and edit longer content.

## Resolution
1.  **Frontend Logic**: Implemented an `adjustTextareaHeight` helper in `ManageProject.jsx` that sets the element height to `scrollHeight`.
2.  **Dynamic Updates**: Updated `handleInputChange` to trigger auto-resize on every keystroke.
3.  **Initial Load**: Added a `useEffect` to resize all textareas once the project data is loaded.
4.  **Styling**: 
    - Increased `min-height` for textareas in `ManageProject.css`.
    - Set `line-height: 1.5` for better readability.
    - Standardized `rows` attribute to `6` for description and `4` for teacher comments as a fallback.

## Changed Files
- [ManageProject.jsx](file:///c:/Users/Ben/AntiGravity/classroom-chat/frontend/src/pages/User/ManageProject.jsx)
- [ManageProject.css](file:///c:/Users/Ben/AntiGravity/classroom-chat/frontend/src/pages/User/ManageProject.css)

## Verification
- Verified by browser subagent: 'Description' textarea expanded from 168px to 264px when content was added.
- Screenshot: [click_feedback_1776324396441.png](file:///C:/Users/Ben/.gemini/antigravity/brain/9a608f08-83e8-4507-b127-f1ca4a44bd37/.system_generated/click_feedback/click_feedback_1776324396441.png)

