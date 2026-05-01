## Root Cause
The "Submit Challenge" form was structured linearly with all fields (including optional ones) visible by default. This, combined with large vertical spacing and a relatively small desktop viewport (788px height), pushed the primary "Submit Challenge" button off-screen, requiring users to scroll for a very common action.

## Changes
- **Frontend Refactor**: Updated `SubmitChallenge.jsx` to introduce a collapsible `optional-section`. This section hides the "Who helped you?" and "Notes" fields behind a toggle button, which 90% of users don't need for every submission.
- **Premium UI**: 
    - Implemented a wider, more modern layout with a glassmorphism effect for the form card.
    - Added a clear "Required" badge for the URL input.
    - Enhanced the "Submit Challenge" button with gradients, shadows, and a custom loading spinner.
    - Redesigned the "Quick Submit" (bookmarklet) section to be more visually distinct and professional.
- **Responsive Layout**: Added media queries to ensure the form remains compact on smaller vertical viewports.

## Changed Files
- `frontend/src/pages/General/SubmitChallenge.jsx`
- `frontend/src/pages/General/SubmitChallenge.css`

## Evidence
- Fix verified at `http://localhost:5173/submit-challenge`.
- Primary action button is now visible at y=364px (well within the viewport).
- Optional fields expand smoothly with a slide animation.
