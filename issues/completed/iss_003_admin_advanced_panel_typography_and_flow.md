# Issue: Advanced Panel Typography and Flow Inconsistency

## Status
- **ID**: `iss_003`
- **Severity**: Low
- **Category**: Typography / Layout
- **Component**: AdvancedPanel

## Description
The Advanced Database Management page contains typography and layout choices that disrupt the visual flow. Specifically, the main title is excessively large (40px with weight 800) and the secondary "help" text is significantly larger than conventional secondary text.

### Findings
1. **Title Sizing**: 40px font size is consistent with other pages but feels overwhelming when paired with the massive horizontal gap (289px) mentioned in `iss_001`.
2. **Help Text Sizing**: The instructional text ("Direct access to backend...") is 17.6px. This is nearly the same size as primary body text, failing to create a proper visual hierarchy for secondary information.
3. **Unbalanced Grid**: The utility stack on the right feels cramped compared to the wide model links section on the left, especially on large desktop screens.

## Impact
- **Visual Hierarchy**: The page feels "loud" and lacks a clear focal point.
- **Readability**: Secondary information competes with primary actions.

## Steps to Reproduce
1. Navigate to `/admin/advanced`.
2. Observe the scale of the "Advanced Database Management" title relative to the content below it.
3. Note the size of the help text.

## Proposed Fix
- Reduce the main title font size to `2rem` (32px) or `2.25rem` (36px) to match the sub-page context.
- Reduce help text font size to `0.95rem` or `1rem` (16px) to differentiate it from headings.
- Adjust the grid layout to `1fr 400px` or similar to balance the columns.

## Screenshots
- [admin_layout_audit_recording](file:///C:/Users/Ben/.gemini/antigravity/brain/f592d7be-5ddb-4b13-ae66-ed2afc1bc396/admin_layout_audit_screenshots_1776915835592.webp)
