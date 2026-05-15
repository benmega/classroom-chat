# Issue: High Saturation in Project Review Cards

## Status
- **ID**: iss_003
- **Severity**: Low
- **Type**: Aesthetic Polish
- **Reporter**: Antigravity

## Description
In the Admin Panel's Projects view, the cards marked "Review Needed" utilize a very high-saturation red background (`#FF0000` or similar). While intended to draw attention, the intensity of the color can be visually fatiguing and deviates from a "premium" aesthetic.

## Steps to Reproduce
1. Log in as an admin.
2. Navigate to the Admin Panel.
3. Select "Projects" from the sidebar.
4. Locate cards with the "Review Needed" status.

## Expected Behavior
The "Review Needed" state should be indicated using a more balanced, harmonious color palette (e.g., a softer red or a combination of a subtle background and a bold border/accent).

## Environment
- **Browser**: Chrome (via Playwright)
- **Resolution**: 1280x800 (Desktop)

## Root Cause
The `.pending-indicator` badge in `AdminProjects.css` used a highly saturated block background (`rgba(185, 28, 28, 0.9)`) with white text. This high color contrast intensity, while drawing immediate attention, caused visual fatigue when multiple review cards were present and clashed with the application's premium glassmorphic and balanced design aesthetics.

## Resolution & Changed Files
- **`frontend/src/pages/Admin/AdminProjects.css`**: Refactored `.pending-indicator` to use a soft white glass background with a gentle backdrop filter, a subtle border, curated rose-red typography (`#e11d48`), and an elegant CSS-animated pulsing indicator dot (`::before`) for a highly polished, premium dynamic indicator.

## Verification Evidence
- **Screenshot Path**: `C:\Users\Ben\.gemini\antigravity\brain\724f0f93-3fd4-4335-afd3-40f12410d87a\review_needed_badge_verification_1778729233685.png`
