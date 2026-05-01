# Issue: Inconsistent Admin Header Layout and Back Button Sizing

## Status
- **ID**: `iss_001`
- **Severity**: Medium
- **Category**: UI/UX Layout
- **Component**: Admin Pages (Users, Achievements, Advanced)

## Description
The administrative interface exhibits significant layout inconsistencies in the header section, particularly regarding the 'Back' button sizing and its horizontal relationship with the page title on desktop resolutions.

### Findings
1. **Back Button Sizing**: 
   - **Users Page**: 96px width (Balanced).
   - **Achievements/Advanced Pages**: 192px width (Oversized/Stretched).
2. **Horizontal Gap**: 
   - **Users Page**: 24px (Correct).
   - **Achievements Page**: 111.2px (Excessive).
   - **Advanced Page**: 289.6px (Extreme).
3. **Layout Structure**: On some pages, the back button is next to the title, while on others it is positioned above the title but stretching to full width or having erratic margins.

## Impact
- **User Experience**: Creates a disjointed and unprofessional feel as the user navigates between admin sections.
- **Visual Hierarchy**: The erratic spacing on the Advanced page pushes the title too far to the right, breaking the expected reading flow.

## Steps to Reproduce
1. Navigate to the Admin Dashboard.
2. Click on "Users" and observe the header.
3. Click "Back" and then go to "Achievements" or "Advanced Panel".
4. Compare the size of the "Back" button and its distance from the title.

## Proposed Fix
- Standardize the `page-header` structure across all admin pages using a consistent flexbox layout.
- Use a shared `AdminHeader` component or apply a unified CSS class to the header container.
- Ensure the 'Back' button has a fixed or content-based width rather than stretching.
- Maintain a consistent 24px (`1.5rem`) gap between the button and the title.

## Screenshots
- [admin_layout_audit_recording](file:///C:/Users/Ben/.gemini/antigravity/brain/f592d7be-5ddb-4b13-ae66-ed2afc1bc396/admin_layout_audit_screenshots_1776915835592.webp)
