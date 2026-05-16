# Issue: iss_009 - Project Modal and Profile Aesthetic Improvements

## Description
Several small aesthetic and UX issues were identified in the Project Modal and Profile page during the desktop UI audit.

## Findings
1.  **Project Modal Layout**: The "Launch Live" and "Source" buttons in the header are very close to the absolute-positioned "X" (close) button, creating a cramped feel.
2.  **Missing Interactivity Cues**: Note items in the "Digital Notebook" section do not show a `cursor: pointer` on hover, making them feel non-interactive.
3.  **Generic Headings**: The "Description" heading in the Project Modal is a simple `<h3>` without the rich styling (icons/colors) used in other parts of the dashboard.
4.  **Teacher Review Styling**: The "Instructor Review" block in the modal is a simple blockquote; it could be more premium-looking to match the rest of the app.

## Impact
**Low/Medium** - These are polish issues that affect the "premium" feel of the application.

## Suggested Fixes
- Add more margin/padding to `modal-actions` or adjust the positioning of the close button.
- Add `cursor: pointer` to `.note-item` in `Profile.css`.
- Update the "Description" heading in `ProjectModal.jsx` to include a `lucide-react` icon (e.g., `FileText`) and use a styled panel-like header.
- Enhance the `teacher-feedback` block styling with a better background or border.

## Screenshots
![Project Modal Aesthetics](file:///C:/Users/Ben/.gemini/antigravity/brain/0a1aab7a-4728-452d-8d76-a356f2e1ae0b/project_modal_logic_visible_1778900035570.png)


## Root Cause
There was no CSS definition for `.modal-actions` leaving it unstyled and cramped. The Description heading lacked a Lucide icon. `.teacher-feedback` was using a simple blockquote style, and `.note-item` lacked `cursor: pointer`.

## Changed Files
- frontend/src/components/profile/ProjectModal.jsx
- frontend/src/pages/Profile/Profile.css